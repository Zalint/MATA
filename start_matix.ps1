# Script de démarrage pour l'application Matix
# Configuration des variables d'environnement pour la base de données

Write-Host "=== Démarrage de l'application Matix ===" -ForegroundColor Green

# Configuration des variables d'environnement de la base de données
$env:DB_HOST = "localhost"
$env:DB_PORT = "5432"
$env:DB_USER = "postgres"
$env:DB_PASSWORD = "bonea2024"
$env:DB_NAME = "ventes_db_preprod"

Write-Host "Variables d'environnement configurées:" -ForegroundColor Yellow
Write-Host "  DB_HOST: $env:DB_HOST"
Write-Host "  DB_PORT: $env:DB_PORT"
Write-Host "  DB_USER: $env:DB_USER"
Write-Host "  DB_NAME: $env:DB_NAME"
Write-Host "  DB_PASSWORD: [MASQUÉ]"
Write-Host ""

# Vérification que le fichier server.js existe
if (Test-Path "server.js") {
    Write-Host "Démarrage du serveur Node.js..." -ForegroundColor Green
    node server.js
} else {
    Write-Host "ERREUR: Le fichier server.js n'a pas été trouvé dans le répertoire courant." -ForegroundColor Red
    Write-Host "Assurez-vous d'être dans le bon répertoire." -ForegroundColor Red
    pause
}
