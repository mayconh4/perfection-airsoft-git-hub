import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

/** 
 * Polyfill para Deno.writeAll 
 * O Supabase atualizou o Edge Runtime dele recentemente e removeu essa função globalmente,
 * o que quebra bibliotecas de SMTP mais antigas. Este código restaura a função.
 */
if (!(Deno as any).writeAll) {
  (Deno as any).writeAll = async (w: any, data: Uint8Array) => {
    let nwritten = 0;
    while (nwritten < data.length) {
      nwritten += await w.write(data.subarray(nwritten));
    }
  };
}

const SMTP_HOSTNAME = Deno.env.get('SMTP_HOSTNAME') || 'smtp.hostinger.com';
const SMTP_PORT = Number(Deno.env.get('SMTP_PORT')) || 465;
const SMTP_USERNAME = Deno.env.get('SMTP_USERNAME') || '';
const SMTP_PASSWORD = Deno.env.get('SMTP_PASSWORD') || '';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

function getRemindersEmailHtml(data: {
  eventName: string;
  eventDescription?: string;
  engagementRules?: string[];
  missionType?: string;
  gameMode?: string;
}) {
  // Mapping labels for the email template (since we don't share files with the frontend easily)
  const typeMap: Record<string, string> = { 'milsim': 'Milsim: Real Action', 'forfun': 'ForFun: Diversão' };
  const modeMap: Record<string, any> = {
    'tdm': { label: 'Team Deathmatch', slug: 'team-deathmatch' },
    'defend_zone': { label: 'Defend the Zone', slug: 'defend-the-zone' },
    'skirmish': { label: 'Skirmish', slug: 'skirmish-free-for-all' },
    'ctf': { label: 'Capture the Flag', slug: 'capture-the-flag' },
    'bomb': { label: 'Bomb Defusal', slug: 'bomb-defusal' },
    'domination': { label: 'Domination', slug: 'domination' },
    'koth': { label: 'King of the Hill', slug: 'king-of-the-hill' },
    'vip': { label: 'Protect the VIP', slug: 'protect-the-vip' },
    'search_destroy': { label: 'Search and Destroy', slug: 'search-and-destroy' },
    'last_man': { label: 'Last Man Standing', slug: 'last-man-standing' },
    'zombie': { label: 'Infection', slug: 'zombie-infection' },
    'recon': { label: 'Reconhecimento', slug: 'recon-reconhecimento' }
  };

  const typeLabel = data.missionType ? typeMap[data.missionType] : null;
  const modeInfo = data.gameMode ? modeMap[data.gameMode] : null;

  const classificationSection = (typeLabel || modeInfo) ? `
    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
      ${typeLabel ? `<span style="background: #ffc10720; color: #ffc107; border: 1px solid #ffc10740; padding: 4px 10px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">${typeLabel}</span>` : ''}
      ${modeInfo ? `<span style="background: #ffffff10; color: #ffffff; border: 1px solid #ffffff20; padding: 4px 10px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">${modeInfo.label}</span>` : ''}
    </div>
    ${modeInfo ? `<p style="font-size: 10px; color: #666; text-transform: uppercase; margin-top: -10px; margin-bottom: 20px;">💡 <a href="https://www.perfectionairsoft.com.br/blog/modos/${modeInfo.slug}" style="color: #ffc107; text-decoration: none;">Clique aqui para estudar o dossiê deste modo</a></p>` : ''}
  ` : '';

  const rulesSection = (data.engagementRules && data.engagementRules.length > 0) 
    ? `
      <div style="background: #1a1a15; padding: 20px; border: 1px dashed #ffc107; margin: 20px 0;">
        <h3 style="color: #ffc107; text-transform: uppercase; margin-top: 0; font-size: 14px; letter-spacing: 2px;">Regras de Engajamento</h3>
        <ul style="padding-left: 20px; color: #fff; font-size: 11px; text-transform: uppercase; list-style: square;">
          ${data.engagementRules.map(rule => `<li style="margin-bottom: 5px;">${rule}</li>`).join('')}
        </ul>
      </div>
    ` : '';

  const missionSection = data.eventDescription ? `
    <div style="background: #000; padding: 20px; border-left: 3px solid #ffc107; margin: 20px 0;">
      <h3 style="color: #ffc107; text-transform: uppercase; margin-top: 0; font-size: 14px; letter-spacing: 2px;">Dossiê da Missão</h3>
      <p style="color: #ccc; font-size: 12px; font-family: monospace; white-space: pre-line;">${data.eventDescription}</p>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #0d0d0d; color: #ffffff; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #1a1a15; border: 1px solid #ffc10720; }
    .header { background-color: #ffc107; padding: 30px; text-align: center; }
    .content { padding: 30px; line-height: 1.6; }
    .hud-line { height: 2px; background: linear-gradient(90deg, transparent, #ffc107, transparent); margin: 20px 0; }
    .footer { padding: 20px; text-align: center; color: #444; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; }
    .checklist-item { color: #fff; font-size: 12px; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #0d0d0d; text-transform: uppercase; letter-spacing: -1px;">PREPARE-SE PARA A MISSÃO!</h1>
    </div>
    <div class="content">
      <h2 style="text-transform: uppercase; letter-spacing: 2px; color: #ffc107; font-size: 18px;">Tudo pronto para amanhã, operador?</h2>
      <p>Operador <strong>${data.buyerName}</strong>, identificamos sua participação confirmada na missão <strong>${data.eventName}</strong>.</p>
      
      ${classificationSection}
      ${missionSection}
      ${rulesSection}

      <div style="background: #000; padding: 20px; border: 2px solid #ffc107; margin: 20px 0;">
        <h3 style="color: #ffc107; text-transform: uppercase; margin-top: 0; font-size: 14px; letter-spacing: 2px; text-align: center;">Checklist de Prontidão</h3>
        <div class="checklist-item">☑ Baterias recarregadas?</div>
        <div class="checklist-item">☑ Speed loaders abastecidos?</div>
        <div class="checklist-item">☑ Água e barra de cereal prontas?</div>
        <div class="checklist-item">☑ Meias?</div>
        <div class="checklist-item">☑ Óculos?</div>
        <div class="checklist-item">☑ Luvas?</div>
        <div class="checklist-item">☑ Calça?</div>
        <div class="checklist-item">☑ Proteção facial?</div>
      </div>

      <div class="hud-line"></div>

      <p style="text-align: center; font-weight: 900; color: #ffc107; text-transform: uppercase; letter-spacing: 1px;">
        Lembre-se: um operador preparado é um operador pontual!
      </p>
    </div>
    <div class="footer">
      © 2026 PERFECTION AIRSOFT // OPERATIONAL HUB // BRAZIL
    </div>
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 1. Calcular o intervalo de "Amanhã" (no fuso UTC do servidor)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Início e fim do dia seguinte (UTC)
    const startOfTomorrow = new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString();
    const endOfTomorrow = new Date(tomorrow.setHours(23, 59, 59, 999)).toISOString();

    console.log(`[REMIDERS] Iniciando varredura tática para eventos entre ${startOfTomorrow} e ${endOfTomorrow}`);

    // 2. Buscar eventos ocorrendo amanhã
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, description, engagement_rules, mission_type, game_mode')
      .gte('event_date', startOfTomorrow)
      .lte('event_date', endOfTomorrow);

    if (eventsError) throw eventsError;

    if (!events || events.length === 0) {
      console.log('[REMIDERS] Nenhuma missão detectada para amanhã.');
      return new Response(JSON.stringify({ message: 'Nenhuma missão amanhã.' }), { status: 200 });
    }

    let emailsEnviados = 0;

    // 3. Para cada evento, buscar compradores confirmados
    for (const event of events) {
      console.log(`[REMIDERS] Processando Missão: ${event.title} (ID: ${event.id})`);
      
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('buyer_name, buyer_email')
        .eq('event_id', event.id)
        .eq('status', 'confirmed');

      if (ticketsError) {
        console.error(`Erro ao buscar tickets para evento ${event.id}:`, ticketsError.message);
        continue;
      }

      if (!tickets || tickets.length === 0) {
        console.log(`[REMIDERS] Nenhum operador confirmado para ${event.title}.`);
        continue;
      }

      // 4. Enviar e-mails via SMTP
      const client = new SmtpClient();
      try {
        await client.connectTLS({
          hostname: SMTP_HOSTNAME,
          port: SMTP_PORT,
          username: SMTP_USERNAME,
          password: SMTP_PASSWORD,
        });

        for (const ticket of tickets) {
          if (!ticket.buyer_email) continue;

          try {
            const emailHtml = getRemindersEmailHtml({
              buyerName: ticket.buyer_name,
              eventName: event.title,
              eventDescription: event.description,
              engagementRules: event.engagement_rules,
              missionType: event.mission_type,
              gameMode: event.game_mode
            });

            await client.send({
              from: `Perfection Airsoft <${SMTP_USERNAME}>`,
              to: ticket.buyer_email,
              subject: `🫡 Checklist Preparatório: Missão ${event.title}`,
              content: 'Por favor, visualize este e-mail em um cliente HTML.',
              html: emailHtml,
            });
            emailsEnviados++;
          } catch (mailErr) {
            console.error(`Erro ao enviar e-mail para ${ticket.buyer_email}:`, mailErr.message);
          }
        }
      } finally {
        try {
          await client.close();
        } catch (e) {
          // Já fechado ou erro ao fechar
        }
      }
    }

    console.log(`[REMIDERS] Operação Finalizada. Eventos: ${events.length}, E-mails: ${emailsEnviados}`);

    return new Response(JSON.stringify({ 
      success: true, 
      eventsFound: events.length,
      emailsSent: emailsEnviados 
    }), { 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error('[REMIDERS CRITICAL ERROR]', err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
