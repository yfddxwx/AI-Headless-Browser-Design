@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe" "%~dp0\agent-browser-mcp.js" %*
) ELSE (
  @SETLOCAL
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node "%~dp0\agent-browser-mcp.js" %*
)
