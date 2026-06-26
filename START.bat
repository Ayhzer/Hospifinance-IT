@echo off
echo ========================================
echo   HOSPIFINANCE - Tableau de Bord DSI
echo   Version 2.0 - Optimisee
echo ========================================
echo.

echo [1/3] Verification de Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Node.js n'est pas installe!
    echo Veuillez installer Node.js depuis https://nodejs.org
    pause
    exit /b 1
)
node --version
echo.

echo [2/3] Installation des dependances...
if not exist "node_modules\" (
    echo Installation en cours... Cela peut prendre quelques minutes.
    call npm install
    if %errorlevel% neq 0 (
        echo ERREUR: L'installation a echoue!
        pause
        exit /b 1
    )
    echo Installation terminee avec succes!
) else (
    echo Dependances deja installees.
)
echo.

echo [3/3] Demarrage de l'application...
echo.
echo L'application sera accessible sur: http://localhost:5173
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur.
echo.
call npm run dev
