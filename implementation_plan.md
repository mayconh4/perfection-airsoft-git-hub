# Plano de Implementação: Dashboards e Aprovação (Bloco 8 e 9)

Este plano foca em dar transparência ao organizador sobre suas vendas e permitir que novos usuários solicitem permissão para criar eventos.

## Mudanças Realizadas

### Dashboard do Organizador (Bloco 8)
#### [MODIFICADO] [OrganizerDashboard.tsx](file:///c:/Users/mayco/playground/void-planetoid/tactical-ops-react/src/pages/OrganizerDashboard.tsx)
- Adicionada lista de membros participantes (Modal Tático).
- Integração Real-time com `supabase.channel` para `sold_count`.
- Restauração da Logística de Ganhadores de Rifas.

### Solicitação de Organizador (Bloco 9)
#### [NOVO] [OrganizerRequestForm.tsx](file:///c:/Users/mayco/playground/void-planetoid/tactical-ops-react/src/components/OrganizerRequestForm.tsx)
- Formulário para solicitação de upgrade para `organizer`.
- Campos: Experiência, Equipe/Campo, Redes Sociais.

#### [MODIFICADO] [AdminModeration.tsx](file:///c:/Users/mayco/playground/void-planetoid/tactical-ops-react/src/pages/AdminModeration.tsx)
- Adicionada aba de "Aprovações de Organizador".
- Botões de aprovação KYC e Role Promovida.

## Próximos Passos (Itens Pendentes)

1. **Teste de Fumaça (E2E):** Simular compra real e confirmar geração automática de ingresso.
2. **Refinamento de UX:** Adicionar tooltips sobre o Asaas e badges de "Aprovado" no perfil.

## Plano de Verificação

### Testes Manuais
- [ ] Criar conta nova -> Solicitar Role -> Admin Aprovar -> Abrir Dashboard.
- [ ] Comprar ingresso -> Ver contador subir no Dashboard.
- [ ] Escanear QR Code com o `EventCheckInPage`.
