# Authentication Setup Guide

## Overview
This project now supports email/password authentication and Google OAuth sign-in. The authentication system includes:

- **Login**: Email/password authentication
- **Signup**: Email/password registration with OTP verification
- **Google OAuth**: Sign in/up with Google account
- **Multi-language**: English and Vietnamese support
- **Dark/Light Mode**: Automatic theme switching

## Setup Instructions

### 1. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# API Configuration
API_BASE_URL=http://51.89.150.213:8080/api/v1

# Google OAuth Configuration
GOOGLE_CLIENT_ID=857718557597-j6vcro9n8thl6tc8p5j6vib06dl0oml9.apps.googleusercontent.com

# App Configuration
APP_ENV=development
```

### 2. Google OAuth Setup

#### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Sign-In API

#### Step 2: Create OAuth 2.0 Credentials
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client IDs**
3. Create credentials for each platform:

**For Android:**
- Application type: Android
- Package name: `com.hengout.app` (from app.json)
- SHA-1 certificate fingerprint: Get from your keystore

**For iOS:**
- Application type: iOS
- Bundle ID: `com.hengout.app` (from app.json)

**For Web (development):**
- Application type: Web application
- Authorized JavaScript origins: `http://localhost:8081`
- Authorized redirect URIs: `http://localhost:8081`

#### Step 3: Update Configuration
Update `config/googleAuth.ts` with your actual client IDs:

```typescript
export const GOOGLE_CONFIG = {
    ANDROID_CLIENT_ID: '857718557597-j6vcro9n8thl6tc8p5j6vib06dl0oml9.apps.googleusercontent.com',
    IOS_CLIENT_ID: '857718557597-j6vcro9n8thl6tc8p5j6vib06dl0oml9.apps.googleusercontent.com',
    WEB_CLIENT_ID: '857718557597-j6vcro9n8thl6tc8p5j6vib06dl0oml9.apps.googleusercontent.com',
};
```

### 3. Install Dependencies

```bash
# Install Google Sign-In
npx expo install @react-native-google-signin/google-signin

# Install other dependencies if needed
npm install
```

### 4. API Endpoints

The authentication system uses these API endpoints:

#### Authentication
- `POST /auth/user/login` - User login
- `POST /auth/user/register/send-otp` - Send registration OTP
- `POST /auth/user/register/verify-otp` - Verify registration OTP
- `POST /auth/user/register/resend-otp` - Resend registration OTP
- `POST /auth/user/oauth/google` - Google OAuth login

#### Session Management
- `POST /session/refresh` - Refresh access token
- `POST /session/logout` - Logout user

#### Password Management
- `POST /password/user/forgot` - Forgot password
- `POST /password/forgot/reset` - Reset password
- `POST /password/change` - Change password

### 5. File Structure

```
modules/auth/
├── components/
│   ├── EmailInput.tsx          # Email input component
│   ├── PasswordInput.tsx       # Password input component
│   ├── GoogleButton.tsx        # Google OAuth button
│   ├── EmailLoginForm.tsx      # Login form with email/password
│   ├── SignupForm.tsx          # Signup form
│   └── ErrorMessage.tsx        # Error message component
├── services/
│   └── authService.ts          # API service functions
└── validations/
    └── authSchema.ts           # Validation functions

app/auth/
├── login.tsx                   # Main login screen
├── login-email.tsx             # Email login screen
├── signup.tsx                  # Signup screen
└── verify-otp.tsx              # OTP verification screen

config/
├── api.ts                      # API configuration
└── googleAuth.ts               # Google OAuth configuration
```

### 6. Usage

#### Login Flow
1. User enters email and password
2. App calls `/auth/user/login` API
3. On success, store tokens and navigate to main app

#### Signup Flow
1. User enters email, password, and confirm password
2. App calls `/auth/user/register/send-otp` API
3. User receives OTP via email
4. User enters OTP in verification screen
5. App calls `/auth/user/register/verify-otp` API
6. On success, store tokens and navigate to main app

#### Google OAuth Flow
1. User clicks Google Sign-In button
2. Google OAuth popup appears
3. User authenticates with Google
4. App gets ID token from Google
5. App sends ID token to `/auth/user/oauth/google` API
6. On success, store tokens and navigate to main app

### 7. Token Storage

For production, use secure storage:

```typescript
import * as SecureStore from 'expo-secure-store';

// Store tokens
await SecureStore.setItemAsync('accessToken', response.data.accessToken);
await SecureStore.setItemAsync('refreshToken', response.data.refreshToken);

// Retrieve tokens
const accessToken = await SecureStore.getItemAsync('accessToken');
const refreshToken = await SecureStore.getItemAsync('refreshToken');
```

### 8. Error Handling

The system includes comprehensive error handling:
- Network errors
- Validation errors
- API errors
- User-friendly error messages in multiple languages

### 9. Testing

Test the authentication flow:
1. Try login with valid credentials
2. Try login with invalid credentials
3. Test signup flow with OTP
4. Test Google OAuth (requires proper setup)
5. Test error scenarios

### 10. Security Notes

- Always use HTTPS in production
- Store tokens securely
- Implement token refresh logic
- Validate all user inputs
- Handle session expiration gracefully

## Troubleshooting

### Common Issues

1. **Google Sign-In not working**
   - Check client IDs are correct
   - Verify SHA-1 fingerprint for Android
   - Ensure Google Sign-In API is enabled

2. **API calls failing**
   - Check API_BASE_URL is correct
   - Verify network connectivity
   - Check API server is running

3. **OTP not received**
   - Check email address is correct
   - Verify email server configuration
   - Check spam folder

### Support

For issues or questions, check:
- API documentation
- Google Cloud Console logs
- React Native Google Sign-In documentation
- Expo documentation
