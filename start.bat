@echo off
chcp 65001 >nul
REM Open a new CMD window running Python directly (not via batch).
REM This avoids the "Terminate batch job (Y/N)?" prompt on Ctrl+C,
REM because in the new window, Python is the direct process — not a batch.
start "Z-Image Studio" cmd /c "cd /d %~dp0 && python start.py"
