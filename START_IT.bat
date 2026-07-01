@echo off
title Hospifinance-IT
cd /d "%~dp0"

if not exist node_modules (
  echo Installation des dependances IT...
  call npm install
)

echo.
echo ===================================================
echo   Hospifinance-IT  -  http://localhost:5174
echo   (mode local/localStorage, port dedie 5174)
echo   Laissez cette fenetre ouverte pendant l'utilisation.
echo   Fermez-la (ou Ctrl+C) pour arreter l'application.
echo ===================================================
echo.

rem Ouvre le navigateur une fois le serveur pret (~6s)
start "" /min cmd /c "timeout /t 6 >nul & start http://localhost:5174"

rem Front seul sur 5174 : port dedie, evite tout conflit avec un autre service (5173 / 3001)
call npm run dev -- --port 5174 --strictPort
