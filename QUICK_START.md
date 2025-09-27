# Quick Start Guide - Authentication System

## ✅ Đã hoàn thành setup:

### 1. **Cấu hình API**
- ✅ URL Base: `http://51.89.150.213:8080/api/v1`
- ✅ File config: `config/api.ts`
- ✅ Service: `modules/auth/services/authService.ts`

### 2. **Google OAuth**
- ✅ Client ID: `857718557597-j6vcro9n8thl6tc8p5j6vib06dl0oml9.apps.googleusercontent.com`
- ✅ Package: `@react-native-google-signin/google-signin` (đã cài)
- ✅ Config: `config/googleAuth.ts`

### 3. **Bundle ID**
- ✅ iOS: `com.hengout.app`
- ✅ Android: `com.hengout.app`
- ✅ File: `app.json` (đã cập nhật)

### 4. **Environment**
- ✅ File `.env.local` (đã tạo)
- ✅ API_BASE_URL
- ✅ GOOGLE_CLIENT_ID

## 🚀 Cách test:

### 1. **Chạy app**:
```bash
npx expo start
```

### 2. **Test Login Flow**:
1. Mở app → Click "Sign In"
2. Nhập email và password
3. Click "Continue"
4. Kiểm tra console log

### 3. **Test Signup Flow**:
1. Mở app → Click "Sign In" → Click "Sign Up"
2. Nhập email, password, confirm password
3. Click "Continue"
4. Nhập OTP từ email
5. Click "Verify OTP"

### 4. **Test Google OAuth**:
1. Click "Sign in with Google"
2. Chọn Google account
3. Kiểm tra console log

## 📱 Các màn hình đã tạo:

- `app/auth/login.tsx` - Màn hình chính
- `app/auth/login-email.tsx` - Login email/password
- `app/auth/signup.tsx` - Đăng ký
- `app/auth/verify-otp.tsx` - Xác thực OTP

## 🔧 Components đã tạo:

- `EmailInput.tsx` - Input email
- `PasswordInput.tsx` - Input password
- `GoogleButton.tsx` - Button Google
- `EmailLoginForm.tsx` - Form login
- `SignupForm.tsx` - Form signup

## 🌐 API Endpoints:

### Authentication:
- `POST /auth/user/login` - Login
- `POST /auth/user/register/send-otp` - Gửi OTP
- `POST /auth/user/register/verify-otp` - Xác thực OTP
- `POST /auth/user/oauth/google` - Google OAuth

### Session:
- `POST /session/refresh` - Refresh token
- `POST /session/logout` - Logout

## 🎨 Features:

- ✅ Dark/Light mode
- ✅ Đa ngôn ngữ (EN/VI)
- ✅ Validation forms
- ✅ Error handling
- ✅ Loading states
- ✅ Responsive design

## 🐛 Troubleshooting:

### Nếu Google Sign-In không hoạt động:
1. Kiểm tra Client ID trong `config/googleAuth.ts`
2. Kiểm tra Bundle ID trong `app.json`
3. Kiểm tra Google Cloud Console setup

### Nếu API calls fail:
1. Kiểm tra `API_BASE_URL` trong `config/api.ts`
2. Kiểm tra network connectivity
3. Kiểm tra server status

### Nếu có lỗi TypeScript:
```bash
npm install
npx expo install --fix
```

## 📝 Next Steps:

1. **Test tất cả flows**
2. **Implement token storage** (SecureStore)
3. **Add forgot password** (sẽ làm sau)
4. **Add change password** (sẽ làm sau)
5. **Add logout functionality**
6. **Add token refresh logic**

## 🎯 Success Criteria:

- ✅ Login bằng email/password
- ✅ Signup với OTP verification
- ✅ Google OAuth integration
- ✅ Multi-language support
- ✅ Dark/Light theme
- ✅ Form validation
- ✅ Error handling

**Hệ thống authentication đã sẵn sàng để test! 🎉**
