# ============================================================
# deploy.ps1 — Deploy Automático Perfection Airsoft
# Uso: .\deploy.ps1 [mensagem de commit opcional]
# ============================================================

param(
    [string]$CommitMsg = "chore: auto deploy $(Get-Date -Format 'dd/MM/yyyy HH:mm')"
)

$PROJECT_REF = "seewdqetyolfmqsiyban"
$FUNCTIONS = @("mercadopago-payment", "mercadopago-webhook")

# Carrega o token do .env.deploy ou variável de ambiente
$TOKEN = $env:SUPABASE_ACCESS_TOKEN
if (-not $TOKEN) {
    $envFile = Join-Path $PSScriptRoot ".env.deploy"
    if (Test-Path $envFile) {
        $envContent = Get-Content $envFile | Where-Object { $_ -match "^SUPABASE_ACCESS_TOKEN=" }
        if ($envContent) { $TOKEN = ($envContent -split "=", 2)[1].Trim() }
    }
}

if (-not $TOKEN) {
    Write-Host "ERRO: SUPABASE_ACCESS_TOKEN nao encontrado!" -ForegroundColor Red
    exit 1
}

$env:SUPABASE_ACCESS_TOKEN = $TOKEN

function Write-Step { param($msg) Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function Write-Ok   { param($msg) Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "    FALHA: $msg" -ForegroundColor Red }

# ---- 1. BUILD FRONTEND ----
Write-Step "Iniciando build do frontend..."
$buildOutput = npm run build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Build falhou!"
    Write-Host ($buildOutput | Out-String)
    exit 1
}
Write-Ok "Build concluido"

# ---- 2. GIT COMMIT & PUSH ----
Write-Step "Enviando codigo para o repositorio..."
git add .
git commit -m $CommitMsg 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    $pushOut = git push 2>&1
    if ($LASTEXITCODE -eq 0) { Write-Ok "Git push concluido" }
    else { Write-Fail "Git push falhou: $pushOut" }
} else {
    Write-Host "    INFO: Nada a commitar" -ForegroundColor Yellow
}

# ---- 3. DEPLOY EDGE FUNCTIONS VIA SUPABASE CLI ----
Write-Step "Fazendo deploy das Edge Functions via Supabase CLI..."

foreach ($funcName in $FUNCTIONS) {
    $funcPath = Join-Path $PSScriptRoot "supabase\functions\$funcName\index.ts"

    if (-not (Test-Path $funcPath)) {
        Write-Host "    SKIP: $funcName (arquivo nao encontrado)" -ForegroundColor Yellow
        continue
    }

    try {
        $output = npx supabase functions deploy $funcName --project-ref $PROJECT_REF 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "Deploy de '$funcName' realizado com sucesso"
        } else {
            Write-Fail "Deploy de '$funcName' falhou:`n$output"
        }
    } catch {
        Write-Fail "Excecao ao fazer deploy de '$funcName': $_"
    }
}

# ---- 4. HEALTH CHECK ----
Write-Step "Verificando saude das funcoes..."
Start-Sleep -Seconds 3
foreach ($funcName in $FUNCTIONS) {
    try {
        $hc = Invoke-WebRequest `
            -Uri "https://$PROJECT_REF.supabase.co/functions/v1/$funcName" `
            -Method OPTIONS `
            -SkipHttpErrorCheck `
            -ErrorAction Stop
        Write-Ok "$funcName respondeu (status $($hc.StatusCode))"
    } catch {
        Write-Host "    AVISO: nao foi possivel verificar $funcName" -ForegroundColor Yellow
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   DEPLOY CONCLUIDO COM SUCESSO! " -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
