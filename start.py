"""
Z-Image Studio Launcher
Manages backend (FastAPI/Uvicorn) and frontend (Vite) processes.
Handles Ctrl+C and console close events to cleanly terminate all services.
"""
import subprocess
import signal
import time
import sys
import os
import webbrowser

BACKEND_PORT = 8000
FRONTEND_PORT = 5173

def kill_port(port):
    """Kill any process occupying the given port (Windows only)."""
    try:
        result = subprocess.run(
            f'netstat -ano | findstr ":{port} "',
            capture_output=True, text=True, shell=True
        )
        for line in result.stdout.strip().splitlines():
            parts = line.split()
            if len(parts) >= 5 and ("LISTENING" in parts or "ESTABLISHED" in parts):
                pid = parts[-1]
                if pid and pid != "0":
                    subprocess.run(f"taskkill /F /PID {pid}", shell=True,
                                   capture_output=True)
    except Exception:
        pass

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    print("===================================================")
    print("    Starting Z-Image Studio (INT8)")
    print("===================================================")

    # Clean up stale processes on our ports
    print("Checking ports...")
    kill_port(BACKEND_PORT)
    kill_port(FRONTEND_PORT)
    time.sleep(0.5)

    print(f"[1/3] Starting backend server (FastAPI on :{BACKEND_PORT})...")
    backend = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app",
         "--host", "0.0.0.0", "--port", str(BACKEND_PORT)],
        cwd="backend",
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
    )

    time.sleep(3)

    print(f"[2/3] Starting frontend server (Vite)...")
    frontend = subprocess.Popen(
        "npm run dev",
        cwd="frontend",
        shell=True,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
    )

    time.sleep(3)

    print("[3/3] Opening browser...")
    try:
        webbrowser.open(f"http://localhost:{FRONTEND_PORT}")
    except Exception:
        pass

    print("===================================================")
    print("  All services are running in this terminal.")
    print("  To stop the servers, just press Ctrl+C.")
    print("===================================================")

    def shutdown(*_args):
        print("\nShutting down services...")
        for proc in [frontend, backend]:
            try:
                proc.terminate()
            except Exception:
                pass
        # Give processes a moment to exit
        for proc in [frontend, backend]:
            try:
                proc.wait(timeout=5)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
        print("All services stopped. Goodbye!")
        sys.exit(0)

    # Register signal handlers
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)
    try:
        signal.signal(signal.SIGBREAK, shutdown)  # Windows console close
    except AttributeError:
        pass

    # Wait for any child to exit (shouldn't happen normally)
    try:
        while True:
            if backend.poll() is not None or frontend.poll() is not None:
                break
            time.sleep(1)
    except (KeyboardInterrupt, SystemExit):
        pass

    shutdown()

if __name__ == "__main__":
    main()
