@echo off
echo ===============================================
echo   LittleSigns - Full Stack Setup
echo ===============================================

echo.
echo [1/3] Installing Python backend dependencies...
cd backend
pip install -r requirements.txt
cd ..

echo.
echo [2/3] Installing React frontend dependencies...
npm install

echo.
echo [3/3] Done! Now start the servers:
echo.
echo   Terminal 1 (Backend):
echo     cd backend
echo     python app.py
echo.
echo   Terminal 2 (ML Detection - your existing server):
echo     python app.py    (the original one on port 5000)
echo.
echo   Terminal 3 (Frontend):
echo     npm start
echo.
echo   Open: http://localhost:3000
echo ===============================================
pause
