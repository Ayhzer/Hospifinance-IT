@echo off
echo ========================================
echo   HOSPIFINANCE - Installation
echo ========================================
echo.

echo Verification de Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Node.js n'est pas installe!
    echo.
    echo Telechargez et installez Node.js depuis:
    echo https://nodejs.org/fr/download/
    echo.
    echo Version recommandee: LTS (Long Term Support)
    pause
    exit /b 1
)

echo Node.js detecte:
node --version
echo npm detecte:
call npm --version
echo.

echo Installation des dependances...
echo Cela peut prendre 2-5 minutes selon votre connexion.
echo.

call npm install

if %errorlevel% neq 0 (
    echo.
    echo ERREUR lors de l'installation!
    echo.
    echo Solutions:
    echo 1. Verifiez votre connexion internet
    echo 2. Essayez: npm cache clean --force
    echo 3. Supprimez node_modules et reessayez
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Installation terminee avec succes!
echo ========================================
echo.
echo Pour lancer l'application, executez: START.bat
echo ou tapez: npm run dev
echo.
pause
