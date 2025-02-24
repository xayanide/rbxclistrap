@echo off
set "args=player"
if not "%~1"=="" set "args=player "%*""
node "%~dp0index.js" %args%
