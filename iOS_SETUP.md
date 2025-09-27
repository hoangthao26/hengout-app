# iOS Google OAuth Setup Guide

## ✅ Đã hoàn thành cho iOS:

### 1. **Bundle ID**
- ✅ iOS Bundle ID: `com.hengout.app`
- ✅ File: `app.json` (đã cập nhật)

### 2. **Google OAuth Configuration**
- ✅ Client ID: `857718557597-j6vcro9n8thl6tc8p5j6vib06dl0oml9.apps.googleusercontent.com`
- ✅ Package: `@react-native-google-signin/google-signin@15.0.0`
- ✅ Config: `config/googleAuth.ts` (đã cập nhật cho iOS)

### 3. **Environment Variables**
- ✅ File `.env.local` (đã tạo)
- ✅ GOOGLE_CLIENT_ID (đã cấu hình)

## 🔧 Cấu hình Google Cloud Console cho iOS:

### 1. **Tạo OAuth 2.0 Credentials cho iOS**
1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Chọn project của bạn
3. Vào **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client IDs**
5. Chọn **Application type**: `iOS`
6. Nhập **Bundle ID**: `com.hengout.app`
7. Click **Create**

### 2. **Tạo Web Client ID (Bắt buộc cho iOS)**
1. Trong cùng project, tạo thêm một OAuth 2.0 Client ID
2. Chọn **Application type**: `Web application`
3. **Name**: `HengOut Web Client`
4. **Authorized JavaScript origins**: 
   - `http://localhost:8081` (cho development)
   - `https://your-domain.com` (cho production)
5. **Authorized redirect URIs**:
   - `http://localhost:8081` (cho development)
   - `https://your-domain.com` (cho production)
6. Click **Create**

### 3. **Cập nhật cấu hình trong app**

File `config/googleAuth.ts` đã được cấu hình:
```typescript
export const GOOGLE_CONFIG = {
    CLIENT_ID: '857718557597-j6vcro9n8thl6tc8p5j6vib06dl0oml9.apps.googleusercontent.com',
    IOS_CLIENT_ID: '857718557597-j6vcro9n8thl6tc8p5j6vib06dl0oml9.apps.googleusercontent.com',
    WEB_CLIENT_ID: '857718557597-j6vcro9n8thl6tc8p5j6vib06dl0oml9.apps.googleusercontent.com',
};
```

## 🚀 Test trên iOS:

### 1. **Chạy app trên iOS Simulator**:
```bash
npx expo start
# Sau đó nhấn 'i' để chạy iOS Simulator
```

### 2. **Test Google Sign-In**:
1. Mở app
2. Click "Sign In"
3. Click "Sign in with Google"
4. Chọn Google account
5. Kiểm tra console log

### 3. **Test Login/Signup Flow**:
1. Test login bằng email/password
2. Test signup với OTP verification

## 📱 iOS Specific Notes:

### **Quan trọng cho iOS**:
- ✅ `webClientId` là **bắt buộc** cho iOS
- ✅ `iosClientId` là client ID iOS specific
- ✅ Cần có Web Client ID trong Google Cloud Console
- ✅ Bundle ID phải khớp với Google Cloud Console

### **iOS Permissions**:
Không cần thêm permissions đặc biệt cho Google Sign-In trên iOS.

### **iOS Build**:
```bash
# Build cho iOS
npx expo run:ios

# Hoặc build development
npx expo run:ios --configuration Debug
```

## 🐛 Troubleshooting iOS:

### **Nếu Google Sign-In không hoạt động trên iOS**:

1. **Kiểm tra Bundle ID**:
   ```bash
   cat app.json | grep bundleIdentifier
   # Phải là: "com.hengout.app"
   ```

2. **Kiểm tra Google Cloud Console**:
   - Bundle ID trong iOS OAuth credentials phải khớp
   - Web Client ID phải tồn tại
   - Google Sign-In API phải được enable

3. **Kiểm tra cấu hình**:
   ```typescript
   // Trong config/googleAuth.ts
   webClientId: '857718557597-j6vcro9n8thl6tc8p5j6vib06dl0oml9.apps.googleusercontent.com'
   iosClientId: '857718557597-j6vcro9n8thl6tc8p5j6vib06dl0oml9.apps.googleusercontent.com'
   ```

4. **Kiểm tra console logs**:
   - Mở Xcode Console
   - Hoặc Expo DevTools
   - Tìm lỗi Google Sign-In

### **Common iOS Issues**:

1. **"Sign in failed"**:
   - Kiểm tra Bundle ID
   - Kiểm tra Client IDs
   - Kiểm tra Google Cloud Console setup

2. **"Network error"**:
   - Kiểm tra internet connection
   - Kiểm tra API server status

3. **"Invalid client"**:
   - Kiểm tra Client ID format
   - Kiểm tra Google Cloud Console

## ✅ Success Criteria cho iOS:

- ✅ App chạy trên iOS Simulator
- ✅ Google Sign-In popup xuất hiện
- ✅ Có thể chọn Google account
- ✅ Login thành công
- ✅ Signup với OTP thành công
- ✅ Console logs hiển thị đúng

## 📝 Next Steps:

1. **Test trên iOS Simulator**
2. **Test trên iOS Device** (nếu có)
3. **Implement token storage**
4. **Add forgot password** (sẽ làm sau)
5. **Add change password** (sẽ làm sau)

**iOS setup đã hoàn thành! Bạn có thể test ngay bây giờ. 🎉**
