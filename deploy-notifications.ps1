# Admin Notifications - Quick Deployment Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Admin Notifications Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Firebase CLI is installed
Write-Host "Checking Firebase CLI..." -ForegroundColor Yellow
$firebaseVersion = firebase --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Firebase CLI not found!" -ForegroundColor Red
    Write-Host "Please install it with: npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Firebase CLI installed: $firebaseVersion" -ForegroundColor Green
Write-Host ""

# Check if logged in to Firebase
Write-Host "Checking Firebase login..." -ForegroundColor Yellow
firebase projects:list 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Firebase!" -ForegroundColor Red
    Write-Host "Please login with: firebase login" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Logged in to Firebase" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "Installing Cloud Functions dependencies..." -ForegroundColor Yellow
Set-Location functions
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Build functions
Write-Host "Building Cloud Functions..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build successful" -ForegroundColor Green
Write-Host ""

# Go back to root
Set-Location ..

# Deploy functions
Write-Host "Deploying Cloud Functions..." -ForegroundColor Yellow
firebase deploy --only functions
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Deployment successful" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Admin Notifications Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Login as an admin user" -ForegroundColor White
Write-Host "2. Grant notification permissions" -ForegroundColor White
Write-Host "3. Login as a regular user on another device" -ForegroundColor White
Write-Host "4. Perform check-in, break, or checkout" -ForegroundColor White
Write-Host "5. Admin should receive push notification!" -ForegroundColor White
Write-Host ""
Write-Host "For troubleshooting, see: ADMIN_NOTIFICATIONS_SETUP.md" -ForegroundColor Cyan
