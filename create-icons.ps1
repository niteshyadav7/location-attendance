# Create simple placeholder launcher icons for Android
# This creates basic colored PNG files that won't fail AAPT compilation

$iconSizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

$resPath = "android\app\src\main\res"

# Create a simple base64 encoded 1x1 blue PNG (valid PNG format)
$base64Png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

foreach ($folder in $iconSizes.Keys) {
    $folderPath = Join-Path $resPath $folder
    
    # Create folder if it doesn't exist
    if (-not (Test-Path $folderPath)) {
        New-Item -ItemType Directory -Path $folderPath -Force | Out-Null
    }
    
    # Create ic_launcher.png
    $iconPath = Join-Path $folderPath "ic_launcher.png"
    $bytes = [Convert]::FromBase64String($base64Png)
    [IO.File]::WriteAllBytes($iconPath, $bytes)
    Write-Host "Created: $iconPath"
    
    # Create ic_launcher_round.png (same as regular for now)
    $roundIconPath = Join-Path $folderPath "ic_launcher_round.png"
    [IO.File]::WriteAllBytes($roundIconPath, $bytes)
    Write-Host "Created: $roundIconPath"
}

Write-Host "`nAll launcher icons created successfully!"
Write-Host "Note: These are placeholder 1x1 blue pixels. Replace with actual icons later."
