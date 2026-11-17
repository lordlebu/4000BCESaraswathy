param([int]$Port = 4173, [switch]$NoBrowser)

# Run from a normal Windows desktop terminal. Codex must launch this with host/network
# permission: a sandboxed Vite can print "ready" while the desktop cannot reach it.
$ErrorActionPreference = 'Stop'
$gameRoot = Split-Path -Parent $PSScriptRoot
$gameBase = "http://127.0.0.1:$Port/"
$gameUrl = $gameBase + '?map=field_map_twins&seed=twin-manual-review&hour=12&door=open&title=skip&at=poi_harappa_court'
$logRoot = Join-Path $gameRoot 'dump/local-dev'
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null

function Get-GameResponse {
    try {
        $reply = Invoke-WebRequest -Uri $gameBase -UseBasicParsing -TimeoutSec 2
        return $reply.StatusCode -eq 200 -and $reply.Content -match '/src/main.tsx'
    } catch { return $false }
}

if (-not (Get-GameResponse)) {
    $nodePath = (Get-Command node.exe -ErrorAction Stop).Source
    $vitePath = Join-Path $gameRoot 'node_modules/vite/bin/vite.js'
    if (-not (Test-Path -LiteralPath $vitePath)) { throw 'Install dependencies with npm.cmd ci first.' }
    $gameProcess = Start-Process -FilePath $nodePath -ArgumentList @(
        ('"' + $vitePath + '"'), '--host', '127.0.0.1', '--port', "$Port", '--strictPort'
    ) -WorkingDirectory $gameRoot -WindowStyle Hidden -PassThru `
      -RedirectStandardOutput (Join-Path $logRoot 'vite.out.log') `
      -RedirectStandardError (Join-Path $logRoot 'vite.err.log')
    $gameProcess.Id | Set-Content (Join-Path $logRoot 'vite.pid')
    $deadline = (Get-Date).AddSeconds(25)
    while (-not (Get-GameResponse)) {
        if ($gameProcess.HasExited -or (Get-Date) -gt $deadline) {
            throw "Game did not become reachable. Read $logRoot/vite.err.log. Use a normal desktop terminal or grant host network permission."
        }
        Start-Sleep -Milliseconds 300
    }
}

Write-Host "Game reachable: $gameUrl"
if (-not $NoBrowser) { Start-Process $gameUrl }
