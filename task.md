# ⚡ WAR ROOM — CHECKLIST DE EXECUÇÃO (HOJE)

> Projeto: `tactical-ops-react` | Stack: React + TS + Supabase + Asaas  
> Hora de início: ~09h30 | Meta: MVP de Eventos funcional até meia-noite

---

## 🎯 META DO DIA
> **Até meia-noite, deve ser possível:**
> - [x] Criar um evento real com ingressos
> - [x] Comprar ingresso com PIX (Asaas — já integrado)
> - [x] QR Code real gerado (Disponível em Meus Ingressos)
> - [x] Validar ingresso via scanner web
> - [x] Organizador ver vendas em tempo real no dashboard

---

## ☀️ STATUS ATUAL (RESUMO)

- [x] **Item 1: Fluxo de Upgrade de Role (`organizer`)**
  - [x] Criar formulário de solicitação (`OrganizerRequestForm`)
  - [x] Integrar trava de acesso e formulário no `OrganizerDashboard`
  - [x] Adicionar campo `role_request` na tabela `profiles` (Via Migration)
- [x] **Item 2: Moderador Dashboard (Aprovação de Roles)**
  - [x] Criar interface para admin visualizar pendências
  - [x] Implementar lógica de aprovação (`handleApproveRole`) no `AdminModeration.tsx`
- [x] Item 3: Teste de fumaça (E2E)
  - [x] Simular compra -> Webhook -> Geração Ingresso -> Check-in
  - [x] Criado `UATScannerTester` para simulação direta via Dashboard.
- [x] Item 4: Refinamento UX Dashboards
  - [x] Tooltips explicativos sobre split de pagamento Asaas.
  - [x] Feedback visual de "Approved" (Badges) no perfil do operador.

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

### BLOCO 3 — Próximos Passos (TARDE/NOITE)
- [ ] **Validação do Webhook:** Confirmar se o `create_event_ticket` está sendo disparado corretamente no fluxo real.
- [ ] **Layout de E-mail:** Melhorar o template enviado pelo Resend com o QR Code.

---

## 🔥 PRIORIDADE AGORA
Finalizar o **Item 4** (Refinamento de UX) e realizar o **Teste de Fumaça** definitivo.
