# 🔐 Environment Variables Setup

## Tạo File .env.local

Tạo file `.env.local` ở thư mục gốc project với nội dung sau:

```env
# Google OAuth Configuration
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-google-ios-client-id.apps.googleusercontent.com

# API Configuration
EXPO_PUBLIC_USER_SERVICE_URL=https://api.hengout.app/user-service/api/v1
EXPO_PUBLIC_API_BASE_URL=https://api.hengout.app/auth-service/api/v1
EXPO_PUBLIC_SOCIAL_SERVICE_URL=https://api.hengout.app/social-service/api/v1

# Debug OAuth (optional, set to '1' to enable verbose logging)
EXPO_PUBLIC_DEBUG_OAUTH=0
```

## Lấy Google OAuth Credentials

1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Chọn project của bạn
3. Vào **APIs & Services** → **Credentials**
4. Tạo hoặc xem OAuth 2.0 Client IDs:
   - **Web Client ID**: Cho web và iOS (cần Web application type)
   - **iOS Client ID**: Cho iOS native (cần iOS application type)

## Lưu Ý

- ✅ File `.env.local` đã được thêm vào `.gitignore` - sẽ không bị commit
- ✅ Expo tự động load biến môi trường từ `.env.local`
- ✅ Với Node.js scripts, cần cài `dotenv` package (optional)

## Kiểm Tra

Sau khi tạo `.env.local`, restart Expo dev server:

```bash
npx expo start --clear
```

Code trong `components/LoginWithGoogle.tsx` sẽ tự động đọc từ biến môi trường.

