@echo off
title Hospifinance-IT - Démarrage
cd /d "%~dp0"

echo.
echo  =============================================
echo   Hospifinance-IT - Lancement local
echo  =============================================
echo.

:: Serveur de données (port 3001) dans une nouvelle fenetre
start "Hospifinance-IT - Serveur données (3001)" cmd /k "cd /d "%~dp0" && node local-server.js"

:: Petite pause pour laisser le serveur démarrer
timeout /t 2 /nobreak >nul

:: Vite dev server (port 5173) dans une nouvelle fenetre
start "Hospifinance-IT - App React (5173)" cmd /k "cd /d "%~dp0" && npm run dev"

:: Petite pause puis ouvre le navigateur
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo  Les deux serveurs sont lancés dans des fenêtres séparées.
echo  L'application s'ouvre dans votre navigateur...
echo.
echo  Fermez les deux fenêtres de commande pour tout arrêter.
echo.
pause
