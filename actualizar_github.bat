@echo off
title Subir Cambios a GitHub y Render
echo =======================================================
echo   Actualizando precios en GitHub y Render...
echo =======================================================
echo.

cd /d "%~dp0"
git add .
git commit -m "Actualizacion de precios y catalogo"
git push

echo.
echo =======================================================
echo   Listo! Render detectara los cambios y actualizara
echo   la web automaticamente en 1-2 minutos.
echo =======================================================
pause
