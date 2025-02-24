@echo off
set "args=studio"
if not "%~1"=="" set "args=studio "%*""
node "%~dp0index.js" %args%
