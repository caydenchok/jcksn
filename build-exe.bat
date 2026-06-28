@echo off
echo ========================================
echo   Property AI - Build EXE
echo ========================================
echo.

echo [1/3] Building Next.js app...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Building Electron EXE...
call npm run electron:build
if %errorlevel% neq 0 (
    echo EXE build failed!
    pause
    exit /b 1
)

echo.
echo [3/3] Done!
echo.
echo EXE file is in: dist-electron\
echo.
echo You can now give the .exe file to your father!
echo.
pause
