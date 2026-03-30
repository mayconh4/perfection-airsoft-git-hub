$Report = @{
    Docker = "FALHOU"
    Build = "FALHOU"
    GitPush = "FALHOU"
    DeployPayment = "FALHOU"
    DeployWebhook = "FALHOU"
    Verificacao = "FALHOU"
}

Write-Host "========================================="
Write-Host "1. Verificacao do Docker"
Write-Host "========================================="
docker info 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Docker esta ativo."
    $Report.Docker = "OK"
} else {
    Write-Host "AVISO: Docker nao esta ativo ou houve um erro."
}

Write-Host "`n========================================="
Write-Host "2. Build do frontend"
Write-Host "========================================="
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "Build concluido com sucesso."
    $Report.Build = "OK"
} else {
    Write-Host "ERRO: Falha no build."
}

Write-Host "`n========================================="
Write-Host "3. Versionamento com Git"
Write-Host "========================================="
git add .
$gitStatus = git status --porcelain
if ([string]::IsNullOrWhiteSpace($gitStatus)) {
    Write-Host "AVISO: Nenhuma alteracao para commitar."
    $Report.GitPush = "OK" # Se nao ha mudancas, nao falhou
} else {
    git commit -m "deploy automatico resiliente"
    
    $pushAttempts = 0
    $pushSuccess = $false
    while ($pushAttempts -lt 3 -and -not $pushSuccess) {
        $pushAttempts++
        Write-Host "Tentativa de git push $pushAttempts/3..."
        git push
        if ($LASTEXITCODE -eq 0) {
            $pushSuccess = $true
            $Report.GitPush = "OK"
            Write-Host "Git push executado com sucesso."
        } else {
            Write-Host "Falha no git push. Aguardando 5 segundos..."
            Start-Sleep -Seconds 5
        }
    }
}

Write-Host "`n========================================="
Write-Host "4. Deploy das funcoes do Supabase"
Write-Host "========================================="
$deployPaymentAttempts = 0
$deployPaymentSuccess = $false
while ($deployPaymentAttempts -lt 3 -and -not $deployPaymentSuccess) {
    $deployPaymentAttempts++
    Write-Host "Deploy mercadopago-payment (Tentativa $deployPaymentAttempts/3)..."
    supabase functions deploy mercadopago-payment
    if ($LASTEXITCODE -eq 0) {
        $deployPaymentSuccess = $true
        $Report.DeployPayment = "OK"
    } else {
        Write-Host "Falha no deploy mercadopago-payment. Aguardando 5 segundos..."
        Start-Sleep -Seconds 5
    }
}

$deployWebhookAttempts = 0
$deployWebhookSuccess = $false
while ($deployWebhookAttempts -lt 3 -and -not $deployWebhookSuccess) {
    $deployWebhookAttempts++
    Write-Host "Deploy mercadopago-webhook (Tentativa $deployWebhookAttempts/3)..."
    supabase functions deploy mercadopago-webhook
    if ($LASTEXITCODE -eq 0) {
        $deployWebhookSuccess = $true
        $Report.DeployWebhook = "OK"
    } else {
        Write-Host "Falha no deploy mercadopago-webhook. Aguardando 5 segundos..."
        Start-Sleep -Seconds 5
    }
}

Write-Host "`n========================================="
Write-Host "5. Verificacao das funcoes"
Write-Host "========================================="
supabase functions list
if ($LASTEXITCODE -eq 0) {
    $Report.Verificacao = "OK"
} else {
    Write-Host "AVISO: Nao foi possivel listar as funcoes do Supabase."
}

Write-Host "`n========================================="
Write-Host "RELATORIO FINAL DE DEPLOY"
Write-Host "========================================="
Write-Host "Status do Docker: $($Report.Docker)"
Write-Host "Status do Build: $($Report.Build)"
Write-Host "Status do Git Push: $($Report.GitPush)"
Write-Host "Status do deploy de mercadopago-payment: $($Report.DeployPayment)"
Write-Host "Status do deploy de mercadopago-webhook: $($Report.DeployWebhook)"
Write-Host "Status da verificacao final: $($Report.Verificacao)"
Write-Host "========================================="

$hasError = ($Report.Values -contains "FALHOU")
if ($hasError) {
    Write-Host "`ndeploy finalizado com erros"
} else {
    Write-Host "`ndeploy concluido com sucesso"
}
