$backendPath = "C:\Alocacao\backend"
$frontendPath = "C:\Alocacao\frontend"
$appUrl = "http://localhost:5173/"

Write-Host "Iniciando backend..."
Start-Job -ScriptBlock {
    Set-Location "C:\Alocacao\backend"
    npm install
    npm run dev
}

Start-Sleep -Seconds 8

Write-Host "Iniciando frontend..."
Start-Job -ScriptBlock {
    Set-Location "C:\Alocacao\frontend"
    npm install
    npm run dev
}

Start-Sleep -Seconds 8

Write-Host "Abrindo aplicação..."
Start-Process $appUrl

Write-Host "Backend e frontend rodando em background."