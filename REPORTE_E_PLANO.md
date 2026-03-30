Vamos # Relatório de Progresso e Plano de Ação: Marketplace Raffle

Este documento resume nossas últimas interações e projeta os próximos passos para a plataforma **Tactical Ops / Perfection Airsoft**.

## 📜 Histórico de Conversas Recentes

### 1. Marketplace & Split de Pagamento (Última Fase: 27-28 Mar)
- **Objetivo**: Transformar o site em um marketplace onde múltiplos usuários podem criar seus próprios sorteios (Drops).
- **Entregas**: 
  - Criado `PixKeyManager.tsx` para registro de chaves PIX dos operadores.
  - Implementada função atômica `increment_raffle_sold_tickets` no banco de dados.
  - Início da lógica de split de pagamento via Mercado Pago.

### 2. Navegação & UX (25-26 Mar)
- **Objetivo**: Melhorar a descoberta de produtos e eventos.
- **Entregas**: Reorganização do menu principal em: *Marcas, Rifles, Pistolas, Eventos, Create a Class, Mapas e Customização*.

### 3. Checkout & Logística (24 Mar)
- **Objetivo**: Garantir segurança e automação nas vendas.
- **Entregas**: Integração com **Mercado Pago** (checkout transparente e webhooks) e **Melhor Envio** para cálculo de frete em tempo real.

### 4. Expansão Tática (23-24 Mar)
- **Objetivo**: Engajamento da comunidade e serviços técnicos.
- **Entregas**: Página de **Mapas** e o **Wizard de Customização & Manutenção**, consolidando a plataforma como um hub de Airsoft.

---

## 🎯 Plano de Ação Futuro (Próximos Passos)

### Fase 1: Encerramento do Marketplace (P0)
- **Agent**: `backend-specialist` | **Skill**: `api-patterns`
- [ ] **Trava de Segurança**: Validar no frontend e backend que um "Drop" só pode ser publicado se o criador possuir chave PIX cadastrada no perfil.
- [ ] **Lógica de Split**: Configurar o `disbursement_data` na API do Mercado Pago para dividir o valor entre a taxa da plataforma (comissão) e o lucro do operador.
- [ ] **Confirmação Automática**: Garantir que o webhook do Mercado Pago dispare o incremento de tickets vendidos e envie e-mail/notificação automatizada.

### Fase 2: Separação de Workflows (P1)
- **Agent**: `frontend-specialist` | **Skill**: `frontend-design`
- [ ] **Interface de Criação**: Criar fluxos distintos no dashboard do operador para `Novo Drop` (rifa/venda) e `Nova Missão` (evento agendado), já que possuem metadados e parâmetros financeiros diferentes.

### Fase 3: Escala & IA (P2)
- **Agent**: `orchestrator` | **Skill**: `ui-ux-pro-max`
- [ ] **Integração WhatsApp**: Conectar o sistema de leads vindo do Wizard de Customização diretamente com o seu bot de IA via Webhook.
- [ ] **Painel do Operador**: Implementar telas simples para que o operador acompanhe o progresso de seus Drops (vendas vs tickets totais).

## ✅ Critérios de Sucesso
- Pagamentos realizados com split automático funcionando em ambiente de teste (Sandbox).
- Nenhuma rifa criada sem chave PIX registrada.
- Dashboard funcional e intuitivo para os novos operadores.

---
> [!IMPORTANT]
> Precisamos validar as credenciais de produção do Mercado Pago e as chaves do Melhor Envio para o deploy final da plataforma.
