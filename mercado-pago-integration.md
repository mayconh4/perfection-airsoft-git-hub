# Mercado Pago Integration Plan

Intergrar o gateway de pagamento Mercado Pago (PIX e Cartão de Crédito) ao checkout da Perfection Airsoft.

## Project Type: WEB

## Success Criteria
- [ ] Checkout redireciona ou abre modal do Mercado Pago corretamente.
- [ ] Pagamentos PIX geram o QR Code e rastreiam o status via Webhook.
- [ ] Pedidos no Supabase são marcados como 'pago' automaticamente.
- [ ] Notificações de erro tratadas no frontend.

## Tech Stack
- Frontend: `mercado-pago-js-sdk`
- Backend: Supabase Edge Functions (Deno) / API Mercado Pago
- Database: Supabase (PostgreSQL)

## Task Breakdown

### Phase 1: Infrastructure (Backend & DB)
| Task ID | Name | Agent | Skills |
|---------|------|-------|--------|
| MP-01 | Configurar Secrets (MP_ACCESS_TOKEN) | `security-auditor` | vulnerability-scanner |
| MP-02 | Criar Edge Function `mercado-pago-create-payment` | `backend-specialist` | nodejs-best-practices |
| MP-03 | Atualizar tabela `orders` para incluir `payment_id` e `external_status` | `database-architect` | database-design |

### Phase 2: Frontend Integration
| Task ID | Name | Agent | Skills |
|---------|------|-------|--------|
| MP-04 | Instalar e configurar Mercado Pago SDK no React | `frontend-specialist` | react-best-practices |
| MP-05 | Ligar formulário de Checkout à Edge Function | `frontend-specialist` | clean-code |

### Phase 3: Webhooks & Logistics
| Task ID | Name | Agent | Skills |
|---------|------|-------|--------|
| MP-06 | Criar Edge Function `mercado-pago-webhook` | `backend-specialist` | nodejs-best-practices |
| MP-07 | Validar integridade do webhook | `security-auditor` | red-team-tactics |

## Phase X: Verification
- [ ] `python .agent/scripts/checklist.py .`
- [ ] Teste de pagamento em Sandbox (PIX simulado)
- [ ] Verificação de status no Supabase
- [ ] Build de produção sem erros
