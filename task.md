# ⚡ WAR ROOM — CHECKLIST DE EXECUÇÃO

> Projeto: `tactical-ops-react` | Stack: React + TS + Supabase + Asaas  
> Atualizado: 2026-04-06

---

## 🎯 STATUS GERAL

> - [x] Criar um evento real com ingressos
> - [x] Comprar ingresso com PIX (Asaas — já integrado)
> - [x] Ingresso confirmado e salvo no banco (Disponível em Meus Ingressos)
> - [x] ~~QR Code~~ — **CANCELADO** — Check-in via lista (nome/email/CPF)
> - [x] Check-in funcional via `EventCheckInPage` (busca por nome, email, CPF)
> - [x] Organizador ver vendas em tempo real no dashboard

---

## ✅ STATUS ATUAL (RESUMO)

- [x] **Item 1: Fluxo de Upgrade de Role (`organizer`)**
  - [x] Criar formulário de solicitação (`OrganizerRequestForm`)
  - [x] Integrar trava de acesso e formulário no `OrganizerDashboard`
  - [x] Adicionar campo `role_request` na tabela `profiles` (Via Migration)
- [x] **Item 2: Moderador Dashboard (Aprovação de Roles)**
  - [x] Criar interface para admin visualizar pendências
  - [x] Implementar lógica de aprovação (`handleApproveRole`) no `AdminModeration.tsx`
- [x] **Item 3: Teste de fumaça (E2E)**
  - [x] Simular compra -> Webhook -> Geração Ingresso -> Check-in
  - [x] Criado `UATScannerTester` para simulação direta via Dashboard
- [x] **Item 4: Refinamento UX Dashboards**
  - [x] Tooltips explicativos sobre split de pagamento Asaas
  - [x] Feedback visual de "Approved" (Badges) no perfil do operador

---

## 📋 DETALHAMENTO DAS TAREFAS

### BLOCO 1 — Schema e Banco [CONCLUÍDO]
- [x] Criar tabela `tickets` e `events` (Migration 20260405)
- [x] Implementar Trigger de `sold_count`
- [x] Implementar RPC `checkin_ticket` e `create_event_ticket`

### BLOCO 2 — Dashboards [CONCLUÍDO]
- [x] Estabilizar `OrganizerDashboard.tsx` (JSX fix)
- [x] Adicionar Lista de Participantes (Modal)
- [x] Adicionar Logística de Rifas (Winner tracking)
- [x] Implementar `AdminModeration.tsx` com aprovação de organizadores

### BLOCO 5 — E-mail de Confirmação [EM ANDAMENTO]
- [x] Refatorar asaas-webhook com SMTP Hostinger
- [x] Secrets configurados no Supabase (SMTP_USERNAME, SMTP_PASSWORD, etc)
- [x] Template HTML do e-mail implementado (sem QR Code — decisão do produto)
- [ ] **Testar fluxo completo:** Webhook → Ticket criado → E-mail enviado
- [ ] **Deploy final** consolidado do `asaas-webhook`

### ~~QR Code~~ [CANCELADO — não será implementado]
- [x] ~~Imagem QR Code no e-mail~~ — fora do escopo
- [x] ~~Scanner QR~~ — substituído por lista (nome/email/CPF)

---

## 🔧 BUGS CORRIGIDOS (2026-04-06)
- [x] **DropPage:** Drops com `status: draft/cancelado` apareciam na listagem pública — **CORRIGIDO** (filtro `.eq('status', 'ativo')` para não-admins)
- [x] **EventCheckInPage:** Botão "MARCAR PRESENÇA" ausente — **CORRIGIDO** (função `handleCheckIn` + update no banco com reversão em erro)
- [x] **CheckoutPage:** Campo senha aparecia para usuários logados e em compras digitais — **CORRIGIDO** (condição `!user && !isDigitalOnly`)
- [ ] **CreateClassPage:** Erro TS pré-existente (`string | null` não atribuível a `string | undefined`) — pendente de análise

---

---

## 🎒 PROTOCOLO DE VERIFICAÇÃO TÁTICA (2026-04-07)

- [x] **Status Labels:** 'Soldado em observação' e 'Soldado verificado' integrado
- [x] **Integrity Badge:** 'Complete para ganhar confiabilidade' unificado
- [x] **Automação de Status:** Trigger SQL para promover operador após 3 missões
- [x] **Lembrete de Missão:** Edge Function com Checklist e Intel metadata
- [/] **Manual de Operações (Blog):**
  - [x] Estrutura de dados (`missionCatalog`, `missionLore`)
  - [x] Rotas `/blog` configuradas
  - [/] Refinamento visual (Premium HUD aesthetics)
  - [ ] Validar links 'Saiba Mais' nos popups

## 🔥 PRÓXIMAS PRIORIDADES
1. 🎨 Polir UI do Blog (`BlogListingPage` e `BlogDetailPage`)
2. 🔗 Validar redirecionamentos de 'Saiba Mais' em `CreateEventPage`
3. 🧪 Testar Trigger de Verificação (Manual SQL Verification)
4. 🚀 Deploy final consolidado das Edge Functions
5. 🍃 Fix TS no CreateClassPage (erro pré-existente)
