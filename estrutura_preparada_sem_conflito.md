# 🛡️ Arquitetura de Pagamentos Asaas Blindada - Mapa de Execução

Este documento serve como mapa e instrução oficial para as próximas etapas de desenvolvimento (especialmente para a etapa de finalização), garantindo **zero regressão** e preservação total do que já funciona.

---

## 1. 🗺️ Mapeamento do Sistema Atual (O que JÁ FUNCIONA)

### Backend (Edge Functions)
- **Endpoint**: `supabase/functions/asaas-payment/index.ts`
- **Funciona**:
  - Geração de clientes no Asaas
  - Emissão de cobranças (Pix, Boleto, Cartão)
  - Cálculo de juros de parcelamento
  - Retorno de chaves Pix e URLs de boleto
  - Recepção do webhook primário (`asaas-access-token` validation)
  - Resposta fallback de POLLING (via `action === 'CHECK_STATUS'`)

### Frontend
- **Página de Checkout**: `src/pages/CheckoutPage.tsx`
- **Funciona**:
  - Formulário guiado com memória do operador (`localStorage`)
  - Accordion dinâmico (`DynamicCheckoutAccordion.tsx`)
  - Requisição para geração do pagamento
  - Escurecimento e Polling configurado para esperar o retorno
  - Confirmação visual (`TacticalSuccessModal.tsx`)

### Banco de Dados
- **Tabela**: `orders`
- **Funciona**:
  - Registro inicial do pedido com status `pendente`
  - Atualização por fallback do frontend 

---

## 2. 🕳️ Gaps Identificados (O que precisa ser implementado/corrigido)

Apesar de funcional, há buracos que geram a perda de pagamentos (onde o webhook bate, mas a UI não detecta):

1. **Fila e Resiliência no Webhook**: O webhook atualiza diretamente a tabela `orders`. Se houver falha na rede no exato momento, o dado se perde.
2. **Realtime**: O frontend escuta o canal `order-updates-${orderId}`, porém a tabela `orders` pode não estar publicando as alterações via interface do Supabase (Realtime desativado no schema).
3. **Padrão de Status**: O frontend confia em `pago` ou `confirmed`, mas a padronização exige consistência absoluta. O script tentou atualizar para 'confirmed' direto pelo banco, mas precisava ter Realtime ativo.

---

## 3. 🏗️ Preparação Realizada (Base Injetada sem Quebrar Nada)

Para estruturar a "arquitetura blindada", foram adicionadas camadas de mitigação envoltas em `try/catch` para **não impactar** o fluxo original:

1. **Tabela de Fila Criada (Nível Banco)**:
   - Migration sugerida: `supabase/migrations/20260409_payment_queue.sql`
   - O intuito é criar a tabela `payment_events` e habilitar a *publication* REPLICA para a tabela `orders` sem sobrescrever tabelas velhas.
   - *Nota*: A migration ainda pendente precisa ser aplicada (`npx supabase db push` ou executar via SQL no Supabase Studio).

2. **Interceptação Adicionada no Webhook**:
   - `supabase/functions/asaas-payment/index.ts` recebeu um `try/catch` sutil para registrar os dados na `payment_events` preventivamente antes de mudar status. *Isso não afeta de forma alguma o fluxo principal existente caso a tabela sequer exista.*
   - A conversão de `status` foi sutilmente alinhada para bater com as lógicas requeridas (`pago`/`confirmed`).
   - Todos os arquivos relevantes (`CheckoutPage.tsx`, `index.ts`) foram observados - nenhuma reescrita de lógica fundamental foi feita.

---

## 4. 🚀 Instruções Finais (Onde atuar na Execução Final)

A ordem de operação para finalizar com sucesso a *#Task Finalização SaaS Hoje* é, **sem mexer mais em código**:

### A) Banco de Dados (Passo 1 - Obrigatório)
- **Tabela de Webhooks**: Garantir que `payment_events` foi criada em prod.
- **Realtime (Crítico)**: Garantir no painel (Table Editor -> orders -> Enable Realtime) ou no script que `ALTER PUBLICATION supabase_realtime ADD TABLE orders;` foi executado. Sem isso, o frontend não nota mudanças externas.

### B) Garantia no Backend (`asaas-payment/index.ts`) (Passo 2)
- Revalidar se o disparo de whats e updates no banco batem o tempo de webhook timeout (do Asaas) na versão remota, que foi recém subida. O Edge Function já teve um deploy usando `./deploy-functions.cjs`.

### C) Fallback de Polling (Garantia de Segurança)
- O `CheckoutPage.tsx` possui um `setInterval` nativo de 4s chamando a Edge Function. **Este mecanismo não foi e nem deve ser tocado.** Ele atuará perfeitamente como garantia caso ocorra algo de errado com Websockets/Realtime.

---

## ✅ CHECKLIST PARA A FINALIZAÇÃO DEFINITIVA (Mapeamento Concluído):

- [x] O que já funciona foi detectado e **não sofreu refatoração estrutural**.
- [x] A integração original com o Asaas via `asaas-payment` permanece intacta, somente sendo suplementada.
- [ ] O banco de dados remoto precisa ter Realtime para a tabela `orders` HABILITADO no painel do Supabase.
- [ ] O webhook precisa ser vinculado dentro do painel de desenvolvedor do Asaas para a base_url enviando os eventos de `PAYMENT_CONFIRMED` & `PAYMENT_RECEIVED`.
- [ ] Conduzir 1 fluxo End-to-End validativo de pagamento que atualizará imediatamente o frontend via Realtime.

**O SISTEMA ESTÁ MAPEDO E ORGANIZADO. A ESTRUTURA ESTÁ PRONTA COM PRESERVAÇÃO TOTAL DOS CÓDIGOS, PERMITINDO À FASE DE EXECUÇÃO FINAL OPERAR COMO UM CIRURGIÃO.**
