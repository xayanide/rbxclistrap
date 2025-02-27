@echo off
setlocal
set "scriptDir=%~dp0"
set "args=studio"
if not "%~1"=="" set args=%args% "%~1"
node "%scriptDir%index.js" %args%
endlocal
