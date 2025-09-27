# Google OAuth Setup for iOS App

## Overview
This document outlines the setup process for Google OAuth authentication in the Hengout iOS app using web browser-based OAuth flow.

## Prerequisites
- Google Cloud Console account
- Apple Developer Account
- Expo development environment

## Step 1: Google Cloud Console Setup

### 1.1 Create/Select Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable billing (required for OAuth)

### 1.2 Enable APIs
1. Go to **APIs & Services** → **Library**
2. Search and enable these APIs:
   - **Google+ API**
   - **Google Identity API**
   - **Google OAuth2 API**

### 1.3 Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Select **iOS** as Application type
4. Fill in the form:
   - **Bundle ID**: `com.hengout.app` (from app.json)
   - **App Store ID**: (leave blank if not published)
   - **Team ID**: Your Apple Developer Team ID

### 1.4 Save Credentials
- **Client ID**: `857718557597-j6vcro9n8thl6tc8p5j6vib06dl00ml9.apps.googleusercontent.com`
- **Client Secret**: Not needed for iOS
- **Bundle ID**: `com.hengout.app`
- **iOS URL Scheme**: `com.googleusercontent.apps.857718557597-j6vcro9n8thl6tc8p5j6vib06dl00ml9`

## Step 2: Update App Configuration

### 2.1 Update Google OAuth Service
✅ **COMPLETED** - Client ID has been updated in `services/googleOAuthService.ts`:

```typescript
const GOOGLE_CLIENT_ID = '857718557597-j6vcro9n8thl6tc8p5j6vib06dl00ml9.apps.googleusercontent.com';
```

### 2.2 Verify App Scheme
Ensure `app.json` has the correct scheme:

```json
{
  "expo": {
    "scheme": "hengout",
    "ios": {
      "bundleIdentifier": "com.hengout.app"
    }
  }
}
```

## Step 3: OAuth Flow Implementation

### 3.1 OAuth Flow Steps
1. **User clicks Google Sign In**
2. **App opens web browser** with Google OAuth URL
3. **User authenticates** with Google
4. **Google redirects back** to app with authorization code
5. **App exchanges code** for access token
6. **App gets user info** using access token
7. **App sends token to backend** for verification
8. **Backend creates/updates user** and returns app JWT tokens

### 3.2 Security Features
- **PKCE (Proof Key for Code Exchange)**: Prevents authorization code interception
- **HTTPS only**: All communication over secure channels
- **Token validation**: Backend verifies Google tokens
- **Secure storage**: Tokens stored in SecureStore

## Step 4: Backend Integration

### 4.1 Backend Endpoint
Create a backend endpoint to handle Google OAuth:

```typescript
// POST /auth/google
interface GoogleAuthRequest {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    picture: string;
  };
}

interface GoogleAuthResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  user: User;
}
```

### 4.2 Backend Verification
1. **Verify Google token** with Google's servers
2. **Check user exists** in your database
3. **Create/update user** if needed
4. **Generate JWT tokens** for your app
5. **Return tokens** to mobile app

## Step 5: Testing

### 5.1 Development Testing
1. **Use Expo Go** or **Development Build**
2. **Test OAuth flow** with test Google account
3. **Verify redirect** back to app
4. **Check user data** received

### 5.2 Production Testing
1. **Test with real Google accounts**
2. **Verify backend integration**
3. **Test error scenarios**
4. **Performance testing**

## Troubleshooting

### Common Issues

#### 1. OAuth Consent Screen Not Configured ⚠️ **CRITICAL**
**Error**: "Đã chặn quyền truy cập: Lỗi uỷ quyền" / "Error 400: invalid_request"
**Solution**: 
1. Go to **APIs & Services** → **OAuth consent screen**
2. Configure app name, support email, developer contact
3. Add required scopes: `openid`, `profile`, `email`
4. Add test users (including `hoangthao2222@gmail.com`)
5. Save and wait for changes to take effect

#### 2. Redirect URI Mismatch
**Error**: "redirect_uri_mismatch"
**Solution**: Ensure redirect URI in Google Console matches app scheme

#### 3. Bundle ID Mismatch
**Error**: "invalid_client"
**Solution**: Verify bundle ID in Google Console matches app.json

#### 4. OAuth Not Enabled
**Error**: "access_denied"
**Solution**: Enable Google+ API and Google Identity API

#### 5. Test Users Not Added
**Error**: "access_denied" for specific email
**Solution**: Add email to test users in OAuth consent screen

#### 6. Network Issues
**Error**: "network_error"
**Solution**: Check internet connection and firewall settings

### Debug Steps
1. **Check console logs** for detailed error messages
2. **Verify Google Console** configuration
3. **Test OAuth flow** in browser
4. **Check app scheme** configuration
5. **Verify API keys** and credentials

## Security Best Practices

### 1. Token Management
- **Never store** Google tokens permanently
- **Use short-lived** access tokens
- **Validate tokens** on backend
- **Implement refresh** token rotation

### 2. User Data
- **Minimize data** requested from Google
- **Validate email** domains if needed
- **Implement rate limiting**
- **Log authentication** attempts

### 3. App Security
- **Use HTTPS** for all API calls
- **Implement certificate pinning**
- **Validate redirect URIs**
- **Monitor for suspicious** activity

## Production Checklist

- [ ] Google OAuth credentials configured
- [ ] Backend integration completed
- [ ] Error handling implemented
- [ ] Security measures in place
- [ ] Testing completed
- [ ] Monitoring configured
- [ ] Documentation updated
- [ ] Team trained on OAuth flow

## Support Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Expo AuthSession Documentation](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Apple Developer Documentation](https://developer.apple.com/)

## Next Steps

1. **Get Google OAuth credentials** from Google Cloud Console
2. **Update Client ID** in the service
3. **Test OAuth flow** in development
4. **Implement backend integration**
5. **Deploy to production**























