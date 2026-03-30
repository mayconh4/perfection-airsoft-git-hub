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

# ---- 2. GIT COMMIT & PUSH (antes do deploy para ter o codigo atualizado) ----
Write-Step "Enviando codigo para o repositorio..."
git add .
$commitOut = git commit -m $CommitMsg 2>&1
if ($LASTEXITCODE -eq 0) {
    $pushOut = git push 2>&1
    if ($LASTEXITCODE -eq 0) { Write-Ok "Git push concluido" }
    else { Write-Fail "Git push falhou: $pushOut" }
} else {
    Write-Host "    INFO: Nada a commitar" -ForegroundColor Yellow
}

# ---- 3. DEPLOY EDGE FUNCTIONS VIA .NET HttpClient (Multipart correto) ----
Write-Step "Fazendo deploy das Edge Functions via Management API..."

Add-Type -AssemblyName System.Net.Http

foreach ($funcName in $FUNCTIONS) {
    $funcPath = Join-Path $PSScriptRoot "supabase\functions\$funcName\index.ts"

    if (-not (Test-Path $funcPath)) {
        Write-Host "    SKIP: $funcName (arquivo nao encontrado)" -ForegroundColor Yellow
        continue
    }

    $funcCode = [System.IO.File]::ReadAllBytes($funcPath)
    $handler  = New-Object System.Net.Http.HttpClientHandler
    $client   = New-Object System.Net.Http.HttpClient($handler)
    $client.DefaultRequestHeaders.Add("Authorization", "Bearer $TOKEN")

    $metadata    = '{"name":"' + $funcName + '","verify_jwt":false}'
    $metaContent = New-Object System.Net.Http.StringContent($metadata, [System.Text.Encoding]::UTF8, "application/json")
    $fileContent  = New-Object System.Net.Http.ByteArrayContent(,$funcCode)
    $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/typescript")

    $form = New-Object System.Net.Http.MultipartFormDataContent
    $form.Add($metaContent, "metadata")
    $form.Add($fileContent, "file", "index.ts")

    $url = "https://api.supabase.com/v1/projects/$PROJECT_REF/functions/$funcName"

    try {
        $resp = $client.PutAsync($url, $form).GetAwaiter().GetResult()
        $body = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()

        if ($resp.IsSuccessStatusCode) {
            Write-Ok "Deploy de '$funcName' realizado (status $([int]$resp.StatusCode))"
        } else {
            Write-Fail "PUT falhou ($([int]$resp.StatusCode)): $body"

            # Tenta POST para criar a funcao se nao existir
            $form2 = New-Object System.Net.Http.MultipartFormDataContent
            $metaContent2 = New-Object System.Net.Http.StringContent($metadata, [System.Text.Encoding]::UTF8, "application/json")
            $fileContent2  = New-Object System.Net.Http.ByteArrayContent(,$funcCode)
            $fileContent2.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/typescript")
            $form2.Add($metaContent2, "metadata")
            $form2.Add($fileContent2, "file", "index.ts")

            $url2 = "https://api.supabase.com/v1/projects/$PROJECT_REF/functions"
            $resp2 = $client.PostAsync($url2, $form2).GetAwaiter().GetResult()
            $body2 = $resp2.Content.ReadAsStringAsync().GetAwaiter().GetResult()

            if ($resp2.IsSuccessStatusCode) {
                Write-Ok "Deploy via POST de '$funcName' realizado"
            } else {
                Write-Fail "POST tambem falhou ($([int]$resp2.StatusCode)): $body2"
            }
        }
    } catch {
        Write-Fail "Excecao ao fazer deploy de '$funcName': $_"
    } finally {
        $client.Dispose()
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
