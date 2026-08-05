@echo off
setlocal
cd /d "%~dp0"

set "TASK=%~1"
if "%TASK%"=="" set "TASK=play"

if /i "%TASK%"=="play" goto play
if /i "%TASK%"=="stop" goto stop
if /i "%TASK%"=="test" goto test
if /i "%TASK%"=="dev" goto dev
if /i "%TASK%"=="build" goto build
goto usage

:play
rem Vanilla prototype (main): dependency-free static server, opens the browser.
rem Reclaim the port first so a leftover instance does not block the restart.
node tools\stop-server.js || exit /b 1
node tools\serve.js %2 %3
goto :eof

:stop
node tools\stop-server.js
goto :eof

:test
rem World generator smoke test.
node src\smoke-test.js
goto :eof

:dev
rem Vite dev server. Only exists on the feat/react-upgrade branch.
rem A package.json exists on every branch now, so check for the script itself.
findstr /C:"\"dev\":" package.json >nul 2>&1 || goto nopackage
if not exist node_modules (
  echo Installing dependencies...
  call npm install || exit /b 1
)
call npm run dev
goto :eof

:build
rem A package.json exists on every branch now, so check for the script itself.
findstr /C:"\"dev\":" package.json >nul 2>&1 || goto nopackage
if not exist node_modules (
  echo Installing dependencies...
  call npm install || exit /b 1
)
call npm run build || exit /b 1
call npm run preview
goto :eof

:nopackage
echo This branch has no Vite scripts, so there is nothing for npm to run.
echo The Vite app lives on feat/react-upgrade:
echo     git checkout feat/react-upgrade
echo Then re-run: run %TASK%
echo Or play the vanilla prototype on this branch: run play
exit /b 1

:usage
echo Usage: run [command]
echo.
echo     run             Same as "run play".
echo     run play        Serve the vanilla prototype at http://localhost:4173 and open it.
echo                     Restarts cleanly: a previous instance is stopped first.
echo     run stop        Stop a running prototype server without starting a new one.
echo     run test        Run the world generator smoke test.
echo     run dev         Start the Vite dev server (feat/react-upgrade branch).
echo     run build       Production build, then preview it (feat/react-upgrade branch).
echo.
echo     Add --no-open to "run play" to skip launching the browser.
echo     Set PORT to change the port: set PORT=4174 ^&^& run play
exit /b 1
