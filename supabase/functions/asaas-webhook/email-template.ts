export function getTicketEmailHtml(data: {
  buyerName: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  tickets: Array<{ qrUuid: string; id: string }>;
}) {
  const ticketSections = data.tickets.map((ticket, index) => `
    <div style="border: 1px solid #ffc10740; padding: 20px; margin-bottom: 20px; background: #1a1a15;">
      <h3 style="color: #ffc107; text-transform: uppercase; margin-top: 0;">Ingresso #${index + 1}</h3>
      <div style="text-align: center; background: white; padding: 10px; display: inline-block;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${ticket.qrUuid}" 
             alt="QR Code Ingresso" 
             style="display: block;" />
      </div>
      <p style="font-size: 10px; color: #666; margin-top: 10px;">ID: ${ticket.id}</p>
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
        <strong>Instrução Tática:</strong> Apresente estes QR Codes na entrada do evento para validação imediata. 
        Cada código é único e será invalidado após o primeiro scan.
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
