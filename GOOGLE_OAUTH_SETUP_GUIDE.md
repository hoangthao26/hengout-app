# Google OAuth Setup Guide cho React Native Expo Go

## Bước 1: Tạo Google Cloud Console Project

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project hiện có
3. Enable Google+ API hoặc Google Sign-In API
4. Tạo OAuth 2.0 credentials:
   - Vào "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Authorized redirect URIs:
     - `https://auth.expo.io/@trendslade/project-exe101`
     - `http://localhost:8081` (cho development)

## Bước 2: Cấu hình app.json

Cập nhật file `app.json` với Google OAuth credentials:

```json
{
  "expo": {
    "extra": {
      "googleOAuth": {
        "clientId": "YOUR_GOOGLE_CLIENT_ID_HERE",
        "clientSecret": "YOUR_GOOGLE_CLIENT_SECRET_HERE"
      }
    }
  }
}
```

## Bước 3: Cập nhật GoogleOAuthService

Thay thế dòng 21-22 trong `services/googleOAuthService.ts`:

```typescript
// Thay thế:
private readonly GOOGLE_CLIENT_ID = '';
private readonly GOOGLE_CLIENT_SECRET = '';

// Bằng:
private readonly GOOGLE_CLIENT_ID = Constants.expoConfig?.extra?.googleOAuth?.clientId || '';
private readonly GOOGLE_CLIENT_SECRET = Constants.expoConfig?.extra?.googleOAuth?.clientSecret || '';
```

## Bước 4: Test Google OAuth Flow

1. Chạy app: `expo start`
2. Mở Expo Go trên điện thoại
3. Scan QR code
4. Tap "Login with Google"
5. Browser sẽ mở với Google OAuth
6. Login và authorize app
7. App sẽ nhận authorization code và exchange lấy tokens
8. Gửi ID token lên backend API

## Lưu ý quan trọng:

- **Expo Go**: Chỉ hỗ trợ web-based OAuth flow
- **Development Build**: Có thể sử dụng native Google Sign-In SDK
- **iOS trên Windows**: Có thể develop và test trên Expo Go
- **Production**: Cần build với EAS Build hoặc development build

## Flow hoạt động:

1. User tap "Login with Google"
2. `WebBrowser.openAuthSessionAsync()` mở browser
3. User login với Google
4. Google redirect về app với authorization code
5. App exchange code lấy access token và ID token
6. Gửi ID token lên API `/api/v1/auth/user/oauth/google`
7. Backend verify ID token và trả về access token + refresh token
8. App lưu tokens và navigate đến main screen

## Troubleshooting:

- **"Invalid client"**: Kiểm tra Client ID và redirect URI
- **"Access denied"**: Kiểm tra OAuth consent screen
- **"Redirect URI mismatch"**: Đảm bảo redirect URI khớp với Google Console
- **Network errors**: Kiểm tra internet connection và API endpoints


