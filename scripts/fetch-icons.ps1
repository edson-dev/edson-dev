$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$images = Join-Path $root 'images'
New-Item -ItemType Directory -Force -Path $images | Out-Null

$icons = @(
    @('python', 'python-original'),
    @('html5', 'html5-original'),
    @('css3', 'css3-original'),
    @('javascript', 'javascript-original'),
    @('typescript', 'typescript-original'),
    @('java', 'java-original'),
    @('csharp', 'csharp-original'),
    @('go', 'go-original'),
    @('react', 'react-original'),
    @('nodejs', 'nodejs-original'),
    @('docker', 'docker-original'),
    @('git', 'git-original'),
    @('flask', 'flask-original'),
    @('unity', 'unity-original'),
    @('kubernetes', 'kubernetes-plain'),
    @('godot', 'godot-original'),
    @('postgresql', 'postgresql-original'),
    @('vuejs', 'vuejs-original')
)

foreach ($pair in $icons) {
    $dir = $pair[0]
    $icon = $pair[1]
    $url = "https://raw.githubusercontent.com/devicons/devicon/master/icons/$dir/$icon.svg"
    $out = Join-Path $images "$icon.svg"
    try {
        Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
        $size = (Get-Item $out).Length
        if ($size -lt 100) { Write-Warning "$icon too small ($size bytes), deleting"; Remove-Item $out -Force }
        else { Write-Output "ok  $icon ($size bytes)" }
    }
    catch {
        Write-Warning "FAIL $icon : $($_.Exception.Message)"
    }
    Start-Sleep -Milliseconds 300
}

$socials = @{
    'linkedin-original' = 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@8.15.0/icons/linkedin.svg'
    'gmail-original'    = 'https://cdn.simpleicons.org/gmail'
}

foreach ($entry in $socials.GetEnumerator()) {
    $out = Join-Path $images "$($entry.Key).svg"
    try {
        Invoke-WebRequest -Uri $entry.Value -OutFile $out -UseBasicParsing
        Write-Output "ok  $($entry.Key)"
    }
    catch {
        Write-Warning "FAIL $($entry.Key) : $($_.Exception.Message)"
    }
}

$avatarOut = Join-Path $images 'avatar.png'
try {
    Invoke-WebRequest -Uri 'https://avatars.githubusercontent.com/u/58308497?v=4' -OutFile $avatarOut -UseBasicParsing
    Write-Output "ok  avatar.png"
}
catch {
    Write-Warning "FAIL avatar : $($_.Exception.Message)"
}