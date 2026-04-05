export function getTicketEmailHtml(data: {
  buyerName: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  tickets: Array<{ qrUuid: string; id: string }>;
}) {
  const ticketSections = data.tickets.map((ticket, index) => `
    <div style="border: 2px solid #ffc107; padding: 25px; margin-bottom: 25px; background: #000; color: #fff; text-align: center;">
      <h3 style="color: #ffc107; text-transform: uppercase; margin-top: 0; font-size: 14px; letter-spacing: 2px;">Tag de Operador #${index + 1}</h3>
      <div style="border: 1px solid #ffc10720; padding: 15px; margin: 15px 0; background: #1a1a15;">
        <p style="margin: 0; font-size: 10px; color: #666; text-transform: uppercase;">Identificação</p>
        <p style="margin: 5px 0 0 0; font-size: 18px; color: #fff; font-weight: 900; text-transform: uppercase;">${data.buyerName}</p>
      </div>
      <div style="display: flex; justify-content: center; gap: 20px; margin-top: 15px;">
        <div style="flex: 1; border-right: 1px solid #333; padding-right: 10px;">
          <p style="margin: 0; font-size: 8px; color: #666; text-transform: uppercase;">ID Missão</p>
          <p style="margin: 3px 0 0 0; font-size: 12px; color: #ffc107; font-family: monospace;">#${ticket.qrUuid.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>
    </div>
  `).join('');

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
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #0d0d0d; text-transform: uppercase; letter-spacing: -1px;">PERFECTION AIRSOFT</h1>
    </div>
    <div class="content">
      <h2 style="text-transform: uppercase; letter-spacing: 2px; color: #ffc107; font-size: 18px;">Protocolo de Missão Disponível</h2>
      <p>Operador <strong>${data.buyerName}</strong>,</p>
      <p>Seu acesso para a missão <strong>${data.eventName}</strong> foi confirmado com sucesso.</p>
      
      <div style="background: #000; padding: 15px; border-left: 3px solid #ffc107; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px;"><strong>Data:</strong> ${data.eventDate}</p>
        <p style="margin: 0; font-size: 14px;"><strong>Local:</strong> ${data.eventLocation}</p>
      </div>

      <div class="hud-line"></div>

      ${ticketSections}

      <p style="margin-top: 30px; font-size: 12px; color: #888; border-top: 1px solid #333; padding-top: 10px;">
        <strong>Instrução Tática:</strong> Apresente este documento ou informe seu Nome/CPF no QG do evento para validação de entrada. 
        Sua presença será conferida manualmente em nossa lista de operadores autorizados.
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
