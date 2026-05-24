# Validates Grad Projects Hub artifacts. Exit 0 = OK, 1 = failures.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$fail = @()

function Require-File($rel) {
    $p = Join-Path $root $rel
    if (-not (Test-Path $p)) { $script:fail += "MISSING: $rel" }
}

Require-File 'site\index.html'
Require-File 'site\ideas.html'
Require-File 'site\feedback.html'
Require-File 'site\app.js'
Require-File 'site\css\style.css'
Require-File 'data\ideas.json'
Require-File 'PROGRESS.md'
Require-File 'README.md'

$ideasPath = Join-Path $root 'data\ideas.json'
try {
    $ideas = Get-Content $ideasPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if (-not $ideas.projects -or $ideas.projects.Count -lt 3) {
        $fail += 'ideas.json: need at least 3 projects'
    }
} catch {
    $fail += ('ideas.json: invalid JSON - ' + $_.Exception.Message)
}

foreach ($rel in @('site\ideas.html', 'site\feedback.html')) {
    $p = Join-Path $root $rel
    if (-not (Test-Path $p)) { continue }
    $html = Get-Content $p -Raw -Encoding UTF8
    if ($html -match 'href="preferences\.html"' -or $html -match 'href="history\.html"') {
        $fail += "$rel : stale nav links (use index, ideas, feedback only)"
    }
    if ($html -notmatch 'href="ideas\.html"' -or $html -notmatch 'href="feedback\.html"') {
        $fail += "$rel : missing standard nav links"
    }
}

if ($fail.Count) {
    Write-Output 'VALIDATE_FAIL'
    $fail | ForEach-Object { Write-Output $_ }
    exit 1
}
Write-Output 'VALIDATE_OK'
exit 0
