@echo off
title Actualizar Precios Web - Colon Anahi Embalajes
cls

echo ============================================================
echo   ACTUALIZAR PRECIOS EN LA WEB (Render)
echo   Colon Anahi Embalajes
echo ============================================================
echo.

set "FILE="
if exist "D:\DATOS\Trabajo\Tablet ultima.xlsx" set "FILE=D:\DATOS\Trabajo\Tablet ultima.xlsx"
if exist "D:\DATOS\Trabajo\Tablet ultima.xls" set "FILE=D:\DATOS\Trabajo\Tablet ultima.xls"

if "%FILE%"=="" (
    echo [ERROR] No se encontro el archivo Excel en:
    echo D:\DATOS\Trabajo\Tablet ultima.xls
    echo.
    echo Verifique que el archivo exista en esa carpeta.
    echo.
    pause
    exit /b 1
)

echo [OK] Archivo detectado: %FILE%
echo Subiendo precios a la web...
echo.

set "SCRIPT_DIR=%~dp0"

if exist "%SCRIPT_DIR%curl.exe" (
    "%SCRIPT_DIR%curl.exe" -s -k -F "excel=@%FILE%" https://lista-rpuy.onrender.com/api/upload > "%TEMP%\render_resp.txt"
    type "%TEMP%\render_resp.txt"
    del "%TEMP%\render_resp.txt" >nul 2>&1
    echo.
    echo ============================================================
    echo   Precios actualizados con exito en vivo:
    echo   Catalogo:       https://lista-rpuy.onrender.com
    echo   Lista WhatsApp: https://lista-rpuy.onrender.com/lista.html
    echo ============================================================
) else (
    powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%subir.ps1"
)

echo.
echo Presione cualquier tecla para salir...
pause >nul
