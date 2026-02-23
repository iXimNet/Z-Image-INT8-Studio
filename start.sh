#!/bin/bash

echo "==================================================="
echo "    Starting Z-Image Studio (INT8)"
echo "==================================================="

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID 2>/dev/null
    wait $FRONTEND_PID 2>/dev/null
    echo "Environment stopped. Goodbye!"
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM to run cleanup
trap cleanup SIGINT SIGTERM

echo "[1/3] Starting backend server (FastAPI)..."
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

echo "Waiting for backend to initialize..."
sleep 3

echo "[2/3] Starting frontend server (Vite)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "Waiting for frontend to initialize..."
sleep 3

echo "[3/3] Opening browser..."
if which xdg-open > /dev/null; then
  xdg-open http://localhost:5173
elif which open > /dev/null; then
  open http://localhost:5173
else
  echo "Please open http://localhost:5173 in your browser"
fi

echo "==================================================="
echo "  All services are running in this terminal."
echo "  Press Ctrl+C to stop all services and exit."
echo "==================================================="

# Wait for processes to keep script running
wait $BACKEND_PID
wait $FRONTEND_PID
