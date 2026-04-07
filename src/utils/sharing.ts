/**
 * Utilitário de Compartilhamento Tático
 * Gera links formatados para WhatsApp com UTMs de rastreamento.
 */

interface EventData {
  nome: string;
  organizacao: string;
  data: string;
  horario: string;
  local: string;
  valor: string;
  link: string;
}

/**
 * Gera o link final do WhatsApp com a mensagem tática formatada.
 * @param evento Objeto contendo os dados da missão
 * @returns URL completa para wa.me
 */
export function gerarLinkWhatsApp(evento: EventData): string {
  const texto = `🔥 MISSÃO CONFIRMADA 🔥

📌 Nome da missão: ${evento.nome}
🏢 Organização: ${evento.organizacao}
📅 Data: ${evento.data}
🕗 Briefing: ${evento.horario}
📍 Local: ${evento.local}

💰 Valor: ${evento.valor}

⚠️ Vagas limitadas!

👉 Garanta sua vaga agora:
${evento.link}`;

  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

/**
 * Auxiliar para montar o link público da missão com parâmetros UTM.
 * @param eventId ID único da missão
 * @returns URL completa com UTMs
 */
export function getPublicMissionLink(eventId: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/eventos/${eventId}?utm_source=whatsapp&utm_campaign=share_missao`;
}
