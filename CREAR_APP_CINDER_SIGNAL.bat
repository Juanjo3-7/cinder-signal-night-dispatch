@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo No se ha encontrado Node.js. Instala Node.js LTS desde https://nodejs.org/ y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)
echo Instalando dependencias de escritorio (requiere internet la primera vez)...
call npm install
if errorlevel 1 (
  echo Ha fallado la instalacion de dependencias.
  pause
  exit /b 1
)
echo Creando instalador de Windows...
call npm run dist:win
if errorlevel 1 (
  echo Ha fallado la compilacion.
  pause
  exit /b 1
)
echo Hecho. Comprueba la carpeta dist.
pause
