# Plano de Implementação: E-mail com QR Code (BLOCO 5)

Este plano detalha a integração de um serviço de e-mail (Resend) para enviar ingressos digitais com QR Code automaticamente após a confirmação de pagamento.

## User Review Required

> [!IMPORTANT]
> **API Key do Resend:** Precisaremos que você adicione a Secret `RESEND_API_KEY` no painel do Supabase (Edge Functions > Secrets) para que o envio funcione. Você já possui uma conta no Resend?

## Mudanças Propostas

### Edge Functions
#### [MODIFICAR] [asaas-webhook/index.ts](file:///c:/Users/mayco/.gemini/antigravity/playground/void-planetoid/tactical-ops-react/supabase/functions/asaas-webhook/index.ts)
- Adicionar lógica de envio de e-mail usando `fetch` para a API do Resend.
- O e-mail será disparado logo após a criação bem-sucedida do registro na tabela `tickets`.
- O template será injetado dinamicamente com os dados da missão e o QR Code.

#### [NOVO] [asaas-webhook/email-template.ts](file:///c:/Users/mayco/.gemini/antigravity/playground/void-planetoid/tactical-ops-react/supabase/functions/asaas-webhook/email-template.ts)
- Um helper que retorna o HTML tático do e-mail, seguindo a estética "Tactical HUD" do projeto.
- Incluirá o link: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={{ticket_uuid}}`.

### Banco de Dados
- Nenhuma mudança necessária (usaremos os campos `buyer_email` e `qr_uuid` já existentes).

## Open Questions

> [!WARNING]
> **Frequência de Envio:** Se um usuário comprar 5 ingressos em um único pedido, você prefere:
> 1. Receber **1 e-mail** com os 5 QR Codes listados?
> 2. Receber **5 e-mails** individuais? (Mais simples de implementar inicialmente).

---

## Plano de Verificação

### Testes Manuais
- Usar a ferramenta **UAT Scanner Tool** no Dashboard para disparar um e-mail de teste para o seu próprio endereço.
- Verificar a renderização do QR Code em dispositivos móveis (Gmail/Outlook).
- Validar se o QR Code do e-mail é o mesmo que aparece em "Meus Ingressos".
