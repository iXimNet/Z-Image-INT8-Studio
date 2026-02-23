@echo off
chcp 65001 >nul
echo ===================================================
echo     Starting Z-Image Studio (INT8)
echo ===================================================

echo [1/3] Starting backend server (FastAPI)...
cd backend
REM Use start /B to run in the background within the same terminal
start /B "" python -m uvicorn main:app --host 0.0.0.0 --port 8000
cd ..

echo Waiting for backend to initialize...
timeout /T 3 /NOBREAK >nul

echo [2/3] Starting frontend server (Vite)...
cd frontend
start /B "" npm run dev
cd ..

echo Waiting for frontend to initialize...
timeout /T 3 /NOBREAK >nul

echo [3/3] Opening browser...
start http://localhost:5173

echo ===================================================
echo  All services are running in this terminal.
echo  To stop the servers, simply close this window
echo  or press Ctrl+C.
echo ===================================================

:keep_alive
timeout /T 3600 /NOBREAK >nul
goto keep_alive
