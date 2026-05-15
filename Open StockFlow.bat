@echo off
start "StockFlow Server" powershell.exe -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0Run StockFlow.ps1"
