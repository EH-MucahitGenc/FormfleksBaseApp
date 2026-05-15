$filePath = 'c:\ErkurtProjeler\FormfleksBaseApp\FormfleksBaseApp.Infrastructure\Services\EmailService.cs'
$lines = [System.IO.File]::ReadAllLines($filePath)
$keep = New-Object System.Collections.Generic.List[string]
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($i -lt 291 -or $i -ge 498) {
        $keep.Add($lines[$i])
    }
}
[System.IO.File]::WriteAllLines($filePath, $keep)
Write-Host "Done. Lines remaining: $($keep.Count)"
