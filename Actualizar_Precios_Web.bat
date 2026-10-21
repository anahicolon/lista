@echo off
title Actualizar Precios Web - Colon Anahi Embalajes
chcp 65001 >nul
cd /d "C:\gestion"

node sync_render.js

echo.
echo Presione cualquier tecla para salir...
pause >nul
