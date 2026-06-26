@echo off
echo ========================================
echo   HOSPIFINANCE - Build Production
echo ========================================
echo.

echo Verification de Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Node.js n'est pas installe!
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo Installation des dependances...
    call npm install
)

echo.
echo Creation du build de production...
call npm run build

if %errorlevel% neq 0 (
    echo.
    echo ERREUR lors du build!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Build termine avec succes!
echo ========================================
echo.
echo Le build se trouve dans le dossier: dist/
echo.
echo Pour tester le build en local:
echo   npm run preview
echo.
echo Pour deployer en ligne, consultez: DEPLOYMENT.md
echo.
pause
