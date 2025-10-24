# Firebase Authentication Setup Guide

## 🔥 Bước 1: Tạo Firebase Project

1. **Truy cập Firebase Console:**
   - Vào [Firebase Console](https://console.firebase.google.com/)
   - Click "Create a project" hoặc "Add project"

2. **Cấu hình project:**
   - **Project name**: `hengout-app` (hoặc tên bạn muốn)
   - **Google Analytics**: Bật (khuyến nghị)
   - **Analytics account**: Chọn hoặc tạo mới

## 🔥 Bước 2: Enable Authentication

1. **Vào Authentication:**
   - Trong Firebase Console, click "Authentication"
   - Click "Get started"

2. **Enable Google Provider:**
   - Click tab "Sign-in method"
   - Click "Google"
   - **Enable**: Bật toggle
   - **Project support email**: Chọn email của bạn
   - **Web SDK configuration**: Sẽ hiển thị sau khi enable
   - Click "Save"

## 🔥 Bước 3: Lấy Firebase Config

1. **Vào Project Settings:**
   - Click biểu tượng ⚙️ (Settings) → "Project settings"
   - Scroll xuống "Your apps"
   - Click "Add app" → Web app (biểu tượng `</>`)

2. **Cấu hình Web App:**
   - **App nickname**: `hengout-web`
   - **Firebase Hosting**: Không cần bật
   - Click "Register app"

3. **Copy Firebase Config:**
   - Copy object config hiển thị
   - Paste vào file `config/firebase.ts`

## 🔥 Bước 4: Cập nhật Firebase Config

Thay thế nội dung trong `config/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyC...", // Your actual API key
  authDomain: "hengout-app.firebaseapp.com",
  projectId: "hengout-app",
  storageBucket: "hengout-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef..."
};
```

## 🔥 Bước 5: Cấu hình OAuth Consent Screen (Tự động)

Firebase sẽ tự động cấu hình OAuth consent screen cho bạn:
- ✅ **Không cần test users** - tất cả Gmail đều login được
- ✅ **Không cần verify app** - Firebase handle
- ✅ **Không cần redirect URIs** - Firebase tự động

## 🚀 Test Firebase Authentication

1. **Start app:**
   ```bash
   npx expo start
   ```

2. **Test Google Login:**
   - Tap "Login with Google"
   - Browser sẽ mở với Google OAuth
   - **Tất cả Gmail** đều có thể login được
   - Không cần thêm test users

## 🔍 Debug Logs

App sẽ hiển thị logs:
- `🔥 Firebase Auth Service initialized`
- `🔥 Starting Firebase Google sign-in...`
- `🔥 Firebase sign-in successful: user@email.com`
- `🔄 Authenticating with backend using Firebase...`

## ✅ Ưu điểm Firebase vs Google OAuth:

| Tính năng | Google OAuth | Firebase Auth |
|-----------|--------------|---------------|
| **Setup** | ❌ Phức tạp | ✅ Đơn giản |
| **Test users** | ❌ Cần thêm | ✅ Không cần |
| **App verification** | ❌ Cần verify | ✅ Tự động |
| **All Gmail users** | ❌ Bị chặn | ✅ Hoạt động |
| **Expo Go** | ⚠️ Phức tạp | ✅ Hoạt động tốt |
| **Managed flow** | ❌ Khó setup | ✅ Hoạt động hoàn hảo |

## 🆘 Troubleshooting:

- **"Firebase not initialized"**: Kiểm tra config trong `config/firebase.ts`
- **"Google sign-in failed"**: Đảm bảo Google provider đã được enable
- **"Backend authentication failed"**: Kiểm tra API endpoint và ID token

## 🎯 Kết quả:

Sau khi setup xong:
- ✅ **Tất cả Gmail** có thể login được
- ✅ **Không cần test users**
- ✅ **Hoạt động trên Expo Go**
- ✅ **Managed flow hoàn hảo**
- ✅ **Setup đơn giản**


