# Location Attendance App Icon Generator
# This script resizes the generated icon to all required Android densities

Write-Host "Location Attendance Icon Generator" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

# Source icon path (from artifacts)
$sourceIcon = "C:\Users\NITESH YADAV\.gemini\antigravity\brain\524a30a6-0809-4c35-a750-f3110b60e978\location_attendance_icon_1764921462388.png"

# Check if source exists
if (-not (Test-Path $sourceIcon)) {
    Write-Host "[ERROR] Source icon not found at: $sourceIcon" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Source icon found" -ForegroundColor Green

# Base directory for resources
$resDir = "android\app\src\main\res"

# Define icon sizes for each density
$densities = @{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

# Load System.Drawing assembly for image manipulation
Add-Type -AssemblyName System.Drawing

Write-Host ""
Write-Host "Generating icons for all densities..." -ForegroundColor Cyan
Write-Host ""

foreach ($density in $densities.GetEnumerator()) {
    $folder = $density.Key
    $size = $density.Value
    
    $targetDir = Join-Path $resDir $folder
    
    # Create directory if it doesn't exist
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
    
    # Load source image
    $sourceImage = [System.Drawing.Image]::FromFile($sourceIcon)
    
    # Create new bitmap with target size
    $targetImage = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($targetImage)
    
    # Set high quality rendering
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    # Draw resized image
    $graphics.DrawImage($sourceImage, 0, 0, $size, $size)
    
    # Save both regular and round versions
    $regularIcon = Join-Path $targetDir "ic_launcher.png"
    $roundIcon = Join-Path $targetDir "ic_launcher_round.png"
    
    $targetImage.Save($regularIcon, [System.Drawing.Imaging.ImageFormat]::Png)
    $targetImage.Save($roundIcon, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Cleanup
    $graphics.Dispose()
    $targetImage.Dispose()
    $sourceImage.Dispose()
    
    Write-Host "  [OK] $folder (${size}x${size}px) - ic_launcher.png and ic_launcher_round.png" -ForegroundColor Green
}

Write-Host ""
Write-Host "[SUCCESS] All icons generated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Icons saved to:" -ForegroundColor Cyan
Write-Host "   $resDir\mipmap-*\ic_launcher.png" -ForegroundColor Gray
Write-Host "   $resDir\mipmap-*\ic_launcher_round.png" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "   1. Clean the project: cd android; .\gradlew clean" -ForegroundColor Gray
Write-Host "   2. Rebuild the app to see the new icon" -ForegroundColor Gray
Write-Host ""
