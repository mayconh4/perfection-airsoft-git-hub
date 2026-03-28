---
description: Deploy automático completo (Edge Functions + Frontend)
---

# Deploy Automático

Execute após cada alteração no código. Zero interação manual.

## Pré-requisito (apenas uma vez)

1. Acesse https://app.supabase.com/account/tokens
2. Crie um token com nome "Deploy Script"
3. Abra o arquivo `.env.deploy` no projeto e substitua `COLE_SEU_TOKEN_AQUI` pelo token gerado

## Executar Deploy

// turbo-all
1. Execute o script de deploy:
```powershell
.\deploy.ps1
```

Ou com mensagem de commit personalizada:
```powershell
.\deploy.ps1 -CommitMsg "feat: minha nova funcionalidade"
```

## O que o script faz automaticamente

1. **Build** — executa `npm run build`
2. **Deploy Edge Functions** — faz upload via API REST do Supabase (sem Docker)
3. **Health Check** — verifica se as funções estão respondendo
4. **Git Push** — commita e envia para o repositório remoto
