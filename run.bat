@echo off
echo Starting AutoDocX Application...
echo.

REM Start backend in a new window
echo Starting Spring Boot backend...
start "AutoDocX Backend" cmd /k ".\mvnw.cmd spring-boot:run"

REM Wait a moment for backend to initialize
timeout /t 3 /nobreak >nul

REM Start frontend in a new window
echo Starting React frontend...
start "AutoDocX Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both services are starting...
echo Backend: Spring Boot application
echo Frontend: React development server
echo.
echo Press any key to exit this script (services will continue running)
pause >nul
