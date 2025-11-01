# 🔒 Hướng Dẫn Xóa Secrets Khỏi Git History

GitHub đã phát hiện Google OAuth Client ID và Client Secret trong lịch sử commit. Đây là hướng dẫn để khắc phục **theo best practice**.

## ⚠️ Vấn Đề

GitHub Push Protection đã chặn push vì phát hiện secrets trong các commit:
- `app.json:80` và `app.json:81` (trong commit `40e96f5b30b06c2d5f25a4dcfe225c38b1c01e10`)
- `services/googleOAuthService.ts:28` và `services/googleOAuthService.ts:29` (trong commit `40e96f5b30b06c2d5f25a4dcfe225c38b1c01e10`)
- `app.json:88`, `app.json:89` (trong các commit khác)

## ✅ Giải Pháp Được Khuyến Nghị

### Bước 1: Tạo File .env.local

Tạo file `.env.local` ở thư mục gốc project với nội dung:

```env
# Google OAuth Configuration
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-google-ios-client-id.apps.googleusercontent.com

# API Configuration (nếu cần)
EXPO_PUBLIC_USER_SERVICE_URL=https://api.hengout.app/user-service/api/v1
EXPO_PUBLIC_API_BASE_URL=https://api.hengout.app/auth-service/api/v1
EXPO_PUBLIC_SOCIAL_SERVICE_URL=https://api.hengout.app/social-service/api/v1

# Debug OAuth (optional)
EXPO_PUBLIC_DEBUG_OAUTH=0
```

**Lưu ý:** File `.env.local` đã được thêm vào `.gitignore`, sẽ không bị commit.

### Bước 2: Kiểm Tra Code Đã Dùng Biến Môi Trường

✅ `components/LoginWithGoogle.tsx` - Đã dùng `process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` và `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

✅ `scripts/test-oauth-url.js` - Đã được sửa để dùng biến môi trường

### Bước 3: Làm Sạch Lịch Sử Git

GitHub vẫn chặn push vì secrets từng xuất hiện trong commit cũ. Cần xóa hoàn toàn khỏi lịch sử Git.

#### Cách 1: Sử dụng git-filter-repo (Khuyến nghị)

```powershell
# Cài đặt git-filter-repo
pip install git-filter-repo

# Hoặc trên Windows với Python không có pip:
python -m pip install git-filter-repo

# Xóa mọi version của các file chứa secret khỏi lịch sử commit
git filter-repo --path app.json --path services/googleOAuthService.ts --invert-paths --force

# Hoặc nếu muốn giữ file nhưng chỉ xóa nội dung secrets:
# Tạo file mới sạch và commit, rồi filter-repo để thay thế các version cũ
```

#### Cách 2: Sử dụng BFG Repo-Cleaner (Dễ hơn cho Windows)

```powershell
# Download BFG từ https://rtyley.github.io/bfg-repo-cleaner/
# Hoặc dùng Chocolatey:
choco install bfg

# Tạo file passwords.txt với các secrets cần xóa
# (hoặc dùng --replace-text để thay thế)

# Chạy BFG
bfg --delete-files app.json --delete-files services/googleOAuthService.ts

# Hoặc để thay thế secrets bằng placeholder:
bfg --replace-text passwords.txt
```

#### Cách 3: Manual với git filter-branch (Phức tạp hơn)

```powershell
git filter-branch --force --index-filter `
  "git rm --cached --ignore-unmatch app.json services/googleOAuthService.ts" `
  --prune-empty --tag-name-filter cat -- --all

# Sau đó xóa backup
git for-each-ref --format="%(refname)" refs/original/ | ForEach-Object { git update-ref -d $_ }
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Bước 4: Commit Lại Code Sạch

Sau khi làm sạch lịch sử:

```powershell
# Đảm bảo code hiện tại không có secrets
git add .
git commit -m "Remove secrets and use environment variables"

# Force push (cẩn thận!)
git push origin master --force
```

⚠️ **CẢNH BÁO:** `--force` push sẽ ghi đè lịch sử trên remote. Chỉ làm nếu bạn là người duy nhất làm việc trên branch này hoặc đã thông báo cho team.

### Bước 5: Regenerate OAuth Credentials (Khuyến nghị)

Vì secrets đã bị lộ, nên regenerate credentials mới trong Google Cloud Console:

1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Tìm OAuth 2.0 Client ID của bạn
4. Click **Delete** hoặc **Reset Secret**
5. Tạo credentials mới
6. Cập nhật `.env.local` với giá trị mới

## ❌ Cách KHÔNG Nên Làm

**KHÔNG** bấm vào link "unblock secret" của GitHub để push tạm thời vì:

- ❌ Secrets vẫn tồn tại trong lịch sử repo
- ❌ Người khác fork repo có thể thấy
- ❌ GitHub hoặc Google có thể tự động thu hồi key
- ❌ Không giải quyết vấn đề bảo mật

## 📋 Checklist

- [ ] Tạo file `.env.local` với Google OAuth credentials
- [ ] Kiểm tra code đã dùng biến môi trường (không hardcode)
- [ ] Đảm bảo `.gitignore` có `.env.local` (đã có rồi ✅)
- [ ] Làm sạch lịch sử Git với git-filter-repo hoặc BFG
- [ ] Commit lại code sạch
- [ ] Force push (nếu cần)
- [ ] Regenerate OAuth credentials mới trong Google Cloud Console
- [ ] Cập nhật `.env.local` với credentials mới
- [ ] Thông báo cho team (nếu có) về force push

## 🔗 Tài Liệu Tham Khảo

- [GitHub Push Protection](https://docs.github.com/code-security/secret-scanning/working-with-secret-scanning-and-push-protection)
- [git-filter-repo Documentation](https://github.com/newren/git-filter-repo)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)

## 💡 Lưu Ý

- Sau khi làm sạch lịch sử, mọi người trong team cần clone lại repo hoặc reset local branch
- Nếu đã push lên remote khác (như GitLab), cần làm sạch ở đó nữa
- Backup local repo trước khi chạy filter-repo

