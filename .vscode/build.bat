setlocal

cd "%~dp0..\"

call npm run build

copy /Y "%~dp0..\dist\main.js" "%~dp0..\demo\lib\yamp.js"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0play_sound.ps1"

