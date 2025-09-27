# Navigation Strategy & Swipe Back Configuration

## Overview
This document outlines the navigation strategy and swipe back gesture configuration for the Hengout app, following enterprise best practices for security and UX.

## Swipe Back Configuration

### Global Configuration
- **Default**: `gestureEnabled: true` - Enable swipe back for most screens
- **Security Screens**: Disable swipe back for sensitive operations

### Screen-Specific Configuration

#### ✅ **Swipe Back ENABLED** (Normal Navigation)
- `/auth/login` - Login screen
- `/auth/signup` - Registration screen  
- `/auth/forgot-password` - Forgot password screen

#### ❌ **Swipe Back DISABLED** (Security Screens)
- `/auth/verify-otp` - OTP verification (prevent back to signup)
- `/auth/reset-password-otp` - Reset password OTP (prevent back to forgot password)
- `/auth/reset-password` - Reset password (prevent back to OTP)
- `/(tabs)` - Main app screens (prevent back to auth screens)

## Navigation Methods

### Standard Navigation
```typescript
// Use for normal navigation between screens
NavigationService.navigate(route)
NavigationService.goToLogin()
NavigationService.goToSignup()
```

### Secure Navigation (Replace Stack)
```typescript
// Use for security-critical navigation that prevents back navigation
NavigationService.secureNavigateToTabs()     // Login → Tabs
NavigationService.secureNavigateToHome()     // Any → Home
NavigationService.logoutToLogin()            // Logout → Login
NavigationService.resetToLogin()             // Reset → Login
```

## Security Considerations

### Why Disable Swipe Back?
1. **Authentication Flow**: Prevent users from going back to auth screens after login
2. **OTP Verification**: Prevent back navigation during sensitive verification
3. **Password Reset**: Prevent back navigation during password reset flow
4. **Session Security**: Ensure users can't accidentally return to authenticated areas

### Best Practices
1. **Use `router.replace()`** for security-critical navigation
2. **Disable gestures** on sensitive screens
3. **Clear navigation stack** when logging out
4. **Prevent back navigation** after successful authentication

## Implementation Details

### Stack Configuration
```typescript
<Stack screenOptions={{
    headerShown: false,
    gestureEnabled: true, // Default: enable swipe back
    animation: 'slide_from_right'
}}>
    {/* Normal screens - swipe back enabled */}
    <Stack.Screen name="auth/login" />
    <Stack.Screen name="auth/signup" />
    <Stack.Screen name="auth/forgot-password" />
    
    {/* Security screens - swipe back disabled */}
    <Stack.Screen name="auth/verify-otp" options={{ gestureEnabled: false }} />
    <Stack.Screen name="auth/reset-password-otp" options={{ gestureEnabled: false }} />
    <Stack.Screen name="auth/reset-password" options={{ gestureEnabled: false }} />
    <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
</Stack>
```

### Navigation Service Methods
```typescript
// Standard navigation
static navigate(route: string)
static goToLogin()
static goToSignup()

// Secure navigation (prevents back navigation)
static secureNavigateToTabs()
static secureNavigateToHome()
static logoutToLogin()
static resetToLogin()
```

## UX Benefits

1. **Intuitive Navigation**: Users can swipe back on normal screens
2. **Security**: Prevents accidental navigation to sensitive areas
3. **Consistent Behavior**: Clear rules for when swipe back is available
4. **Enterprise Grade**: Follows security best practices

## Testing Scenarios

### Test Cases
1. **Login Flow**: Verify can't swipe back after successful login
2. **OTP Flow**: Verify can't swipe back during OTP verification
3. **Password Reset**: Verify can't swipe back during reset flow
4. **Logout**: Verify can't swipe back to authenticated screens
5. **Normal Navigation**: Verify can swipe back on login/signup/forgot password

### Expected Behavior
- ✅ Swipe back works on login, signup, forgot password
- ❌ Swipe back disabled on OTP, reset password, main app
- ✅ Back button works on all screens (header navigation)
- ✅ Secure navigation prevents stack manipulation

