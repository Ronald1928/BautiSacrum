Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\usuario\Documents\bautismo-backend-frontend\bautismo-backend"
WshShell.Run """C:\Program Files\nodejs\node.exe"" server.js", 0, False
Set WshShell = Nothing
