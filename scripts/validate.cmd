@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0validate-grad-hub.ps1"
exit /b %ERRORLEVEL%
