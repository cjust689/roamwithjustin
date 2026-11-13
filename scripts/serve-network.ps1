param(
    [ValidateRange(1, 65535)]
    [int]$Port = 8080,
    [switch]$Elevated
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

function Test-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Administrator)) {
    $elevationArguments = @(
        "-NoProfile"
        "-ExecutionPolicy"
        "Bypass"
        "-File"
        "`"$PSCommandPath`""
        "-Port"
        "$Port"
        "-Elevated"
    )

    try {
        Write-Host "Requesting permission for temporary private-network access..."
        $elevatedProcess = Start-Process `
            -FilePath "powershell.exe" `
            -Verb RunAs `
            -ArgumentList $elevationArguments `
            -WorkingDirectory $projectRoot `
            -Wait `
            -PassThru
        exit $elevatedProcess.ExitCode
    }
    catch {
        Write-Error "Administrator approval was cancelled or failed: $($_.Exception.Message)"
        exit 1
    }
}

Set-Location -LiteralPath $projectRoot

$existingListener = Get-NetTCPConnection `
    -State Listen `
    -LocalPort $Port `
    -ErrorAction SilentlyContinue

if ($existingListener) {
    Write-Error "Port $Port is already in use. Stop the existing server and run the command again."
    exit 1
}

$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$ruleName = "RoamWithJustinDevServer-$PID"
$ruleCreated = $false
$serverExitCode = 1

try {
    New-NetFirewallRule `
        -Name $ruleName `
        -DisplayName "Roam With Justin development server ($Port)" `
        -Description "Temporary rule created by npm run serve --network" `
        -Direction Inbound `
        -Action Allow `
        -Protocol TCP `
        -LocalPort $Port `
        -Program $nodePath `
        -Profile Private `
        -RemoteAddress LocalSubnet | Out-Null

    $ruleCreated = $true
    Write-Host "Temporary firewall rule added for TCP $Port on private local networks."
    Write-Host "Stop the server with Ctrl+C to remove the rule."

    $env:ROAM_NETWORK_FIREWALL_ACTIVE = "true"
    & $nodePath (Join-Path $PSScriptRoot "serve.js") "--network" "--port" "$Port"
    $serverExitCode = $LASTEXITCODE
}
finally {
    if ($ruleCreated) {
        Remove-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
        Write-Host "Temporary firewall rule removed."
    }
}

exit $serverExitCode
