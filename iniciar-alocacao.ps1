$backendPath = "C:\Alocacao\backend"
$frontendPath = "C:\Alocacao\frontend"
$appUrl = "http://localhost:5173/"

# Inicia o backend em uma nova janela do PowerShell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "
    Set-Location '$backendPath'
    npm install
    npm run dev
"

# Aguarda um pouco antes de iniciar o frontend
Start-Sleep -Seconds 5

# Inicia o frontend em uma nova janela do PowerShell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "
    Set-Location '$frontendPath'
    npm install
    npm run dev
"

# Aguarda um pouco para o frontend subir
Start-Sleep -Seconds 8

# Abre a aplicação no navegador padrão
Start-Process $appUrl