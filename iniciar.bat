@echo off
title Catalogo de Precios - Lista Oferta A
echo =======================================================
echo   Iniciando Catalogo de Precios - Lista Oferta A
echo   Sincronizado con: C:\gestion\Tablet ultima.xlsx / .xls
echo =======================================================
echo.

cd /d "%~dp0"
start http://localhost:3000
node server.js

pause
