Add-Type -AssemblyName System.Drawing
$image = [System.Drawing.Image]::FromFile("c:\ErkurtProjeler\FormfleksBaseApp\FormfleksBaseApp.Web\wwwroot\images\logo.png")
$bmp = new-object System.Drawing.Bitmap($image)
$colors = @{}
for ($x = 0; $x -lt $bmp.Width; $x += 5) {
    for ($y = 0; $y -lt $bmp.Height; $y += 5) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.A -eq 255 -and ($c.R -ne 255 -or $c.G -ne 255 -or $c.B -ne 255)) {
            $hex = "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B
            $colors[$hex]++
        }
    }
}
$colors.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 5
