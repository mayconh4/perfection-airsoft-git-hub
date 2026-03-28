# ============================================================
# deploy.ps1 — Deploy Automático Perfection Airsoft
# Uso: .\deploy.ps1 [mensagem de commit opcional]
# ============================================================

param(
    [string]$CommitMsg = "chore: auto deploy $(Get-Date -Format 'dd/MM/yyyy HH:mm')"
)

$PROJECT_REF = "dtndhmsfmsvuvfowpcrw"
$FUNCTIONS = @("mercadopago-payment", "mercadopago-webhook")

# Carrega o token do .env.deploy ou variável de ambiente
$TOKEN = $env:SUPABASE_ACCESS_TOKEN
if (-not $TOKEN) {
    $envFile = Join-Path $PSScriptRoot ".env.deploy"
    if (Test-Path $envFile) {
        $envContent = Get-Content $envFile | Where-Object { $_ -match "^SUPABASE_ACCESS_TOKEN=" }
        if ($envContent) { $TOKEN = ($envContent -split "=", 2)[1] }
    }
}

if (-not $TOKEN) {
    Write-Host "ERRO: SUPABASE_ACCESS_TOKEN nao encontrado!" -ForegroundColor Red
    Write-Host "Execute uma vez: echo 'SUPABASE_ACCESS_TOKEN=seu_token' > .env.deploy"
    Write-Host "Gere seu token em: https://app.supabase.com/account/tokens"
    exit 1
}

function Write-Step { param($msg) Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function Write-Ok   { param($msg) Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "    FALHA: $msg" -ForegroundColor Red }

# ---- 1. BUILD FRONTEND ----
Write-Step "Iniciando build do frontend..."
$buildResult = npm run build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Build falhou!"
    Write-Host $buildResult
    exit 1
}
Write-Ok "Build concluido"

# ---- 2. DEPLOY EDGE FUNCTIONS VIA API REST ----
Write-Step "Fazendo deploy das Edge Functions..."

foreach ($funcName in $FUNCTIONS) {
    $funcPath = Join-Path $PSScriptRoot "supabase\functions\$funcName\index.ts"
    
    if (-not (Test-Path $funcPath)) {
        Write-Host "    SKIP: $funcName (arquivo nao encontrado)" -ForegroundColor Yellow
        continue
    }

    $funcCode = Get-Content $funcPath -Raw

    # Cria a preferência da função (metadata)
    $metadata = @{
        name       = $funcName
        verify_jwt = $false
    } | ConvertTo-Json -Compress

    # Monta o corpo multipart/form-data manualmente
    $boundary = [System.Guid]::NewGuid().ToString("N")
    $CRLF = "`r`n"
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"metadata`"",
        "Content-Type: application/json",
        "",
        $metadata,
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"index.ts`"",
        "Content-Type: application/typescript",
        "",
        $funcCode,
        "--$boundary--"
    )
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes(($bodyLines -join $CRLF))

    try {
        $response = Invoke-WebRequest `
            -Uri "https://api.supabase.com/v1/projects/$PROJECT_REF/functions/$funcName" `
            -Method PUT `
            -Headers @{ Authorization = "Bearer $TOKEN" } `
            -ContentType "multipart/form-data; boundary=$boundary" `
            -Body $bodyBytes `
            -ErrorAction Stop

        Write-Ok "Deploy de '$funcName' realizado (status $($response.StatusCode))"
    } catch {
        Write-Fail "Deploy de '$funcName' falhou: $_"
        # Tenta via POST se PUT falhar (criar nova função)
        try {
            $response = Invoke-WebRequest `
                -Uri "https://api.supabase.com/v1/projects/$PROJECT_REF/functions" `
                -Method POST `
                -Headers @{ Authorization = "Bearer $TOKEN" } `
                -ContentType "multipart/form-data; boundary=$boundary" `
                -Body $bodyBytes `
                -ErrorAction Stop
            Write-Ok "Deploy via POST de '$funcName' realizado"
        } catch {
            Write-Fail "Falhou tambem via POST: $_"
        }
    }
}

# ---- 3. HEALTH CHECK ----
Write-Step "Verificando saude das funcoes..."
foreach ($funcName in $FUNCTIONS) {
    try {
        $hc = Invoke-WebRequest `
            -Uri "https://$PROJECT_REF.supabase.co/functions/v1/$funcName" `
            -Method OPTIONS `
            -ErrorAction Stop `
            -SkipHttpErrorCheck
        Write-Ok "$funcName respondeu (status $($hc.StatusCode))"
    } catch {
        Write-Host "    AVISO: nao foi possivel verificar $funcName" -ForegroundColor Yellow
    }
}

# ---- 4. GIT COMMIT & PUSH ----
Write-Step "Enviando codigo para o repositorio..."
git add .
git commit -m $CommitMsg
if ($LASTEXITCODE -eq 0) {
    git push
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Git push concluido"
    } else {
        Write-Fail "Git push falhou"
    }
} else {
    Write-Host "    INFO: Nada a commitar (working tree limpa)" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   DEPLOY CONCLUIDO COM SUCESSO! " -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
