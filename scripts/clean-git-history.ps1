# PowerShell Script để làm sạch Git History
# Script này sẽ xóa các file chứa secrets khỏi lịch sử Git

Write-Host "🔒 Git History Cleanup Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Kiểm tra git-filter-repo
$hasFilterRepo = Get-Command git-filter-repo -ErrorAction SilentlyContinue

if (-not $hasFilterRepo) {
    Write-Host "❌ git-filter-repo chưa được cài đặt!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Cài đặt với một trong các cách sau:" -ForegroundColor Yellow
    Write-Host "  1. pip install git-filter-repo" -ForegroundColor Yellow
    Write-Host "  2. python -m pip install git-filter-repo" -ForegroundColor Yellow
    Write-Host "  3. Download từ: https://github.com/newren/git-filter-repo" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Hoặc sử dụng BFG Repo-Cleaner:" -ForegroundColor Yellow
    Write-Host "  choco install bfg" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✅ git-filter-repo đã được cài đặt" -ForegroundColor Green
Write-Host ""

# Cảnh báo
Write-Host "⚠️  CẢNH BÁO:" -ForegroundColor Yellow
Write-Host "   - Script này sẽ thay đổi lịch sử Git vĩnh viễn" -ForegroundColor Yellow
Write-Host "   - Hãy backup repo trước khi chạy" -ForegroundColor Yellow
Write-Host "   - Sau khi chạy, cần force push" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Bạn có chắc chắn muốn tiếp tục? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "Đã hủy." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🔄 Đang làm sạch lịch sử Git..." -ForegroundColor Cyan
Write-Host ""

# Tạo backup branch
$backupBranch = "backup-before-cleanup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
git branch $backupBranch
Write-Host "✅ Đã tạo backup branch: $backupBranch" -ForegroundColor Green

# Chạy git-filter-repo để xóa các file chứa secrets
# Lưu ý: Cần kiểm tra xem file services/googleOAuthService.ts có tồn tại không
$filesToRemove = @("app.json")
if (Test-Path "services/googleOAuthService.ts") {
    $filesToRemove += "services/googleOAuthService.ts"
}

Write-Host "📁 Các file sẽ bị xóa khỏi lịch sử:" -ForegroundColor Cyan
foreach ($file in $filesToRemove) {
    Write-Host "   - $file" -ForegroundColor Yellow
}
Write-Host ""

# Chạy git-filter-repo
$filesParam = ($filesToRemove | ForEach-Object { "--path $_" }) -join " "
$command = "git filter-repo $filesParam --invert-paths --force"

Write-Host "🚀 Đang chạy: $command" -ForegroundColor Cyan
Write-Host ""

Invoke-Expression $command

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Đã làm sạch lịch sử Git thành công!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Các bước tiếp theo:" -ForegroundColor Cyan
    Write-Host "   1. Kiểm tra code hiện tại không có secrets" -ForegroundColor White
    Write-Host "   2. Commit lại các file sạch:" -ForegroundColor White
    Write-Host "      git add ." -ForegroundColor Gray
    Write-Host "      git commit -m 'Remove secrets and use environment variables'" -ForegroundColor Gray
    Write-Host "   3. Force push (cẩn thận!):" -ForegroundColor White
    Write-Host "      git push origin master --force" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⚠️  Nhớ thông báo cho team về force push!" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Có lỗi xảy ra khi chạy git-filter-repo" -ForegroundColor Red
    Write-Host "   Kiểm tra lại output ở trên" -ForegroundColor Yellow
}

