# 🔍 Debug Auto-Login Flow

## 📋 **Debug Logs Added**

Tôi đã thêm comprehensive debug logs vào các file sau để theo dõi auto-login flow:

### **1. `app/index.tsx` (Splash Screen)**
- `🚀 [SplashScreen] App started, initializing auth...`
- `🔄 [SplashScreen] Auth state changed: { isLoading, isAuthenticated }`
- `✅ [SplashScreen] User is authenticated, navigating to main app`
- `❌ [SplashScreen] User not authenticated, navigating to login`

### **2. `store/authStore.ts` (Auth Store)**
- `🔐 [AuthStore] Starting auth initialization...`
- `🔑 [AuthStore] Stored tokens from SecureStore: { hasAccessToken, hasRefreshToken, ... }`
- `✅ [AuthStore] Found stored tokens, attempting to refresh...`
- `🔄 [AuthStore] Token refresh successful, fetching user profile...`
- `👤 [AuthStore] User profile fetched, setting authenticated = true`
- `❌ [AuthStore] Token refresh failed: [error]`
- `❌ [AuthStore] No stored tokens found, user needs to login`
- `🏁 [AuthStore] Auth initialization completed`

### **3. `services/authHelper.ts` (Token Management)**
- `🔍 [AuthHelper] Reading tokens from SecureStore...`
- `📖 [AuthHelper] Raw tokens from SecureStore: { hasAccessToken, hasRefreshToken, ... }`
- `⏰ [AuthHelper] Token timing info: { currentTime, expirationTime, remainingDuration, isExpired }`
- `✅ [AuthHelper] Successfully retrieved tokens`
- `💾 [AuthHelper] Saving tokens to SecureStore: { accessToken: '***1234', ... }`
- `✅ [AuthHelper] Tokens saved successfully to SecureStore`

---

## 🧪 **Testing Auto-Login Flow**

### **Step 1: Login và Lưu Token**
1. Mở app → Login với tài khoản hợp lệ
2. Check console logs:
   ```
   💾 [AuthHelper] Saving tokens to SecureStore: { accessToken: '***1234', refreshToken: '***5678', ... }
   ✅ [AuthHelper] Tokens saved successfully to SecureStore
   ```

### **Step 2: Tắt App Hoàn Toàn**
1. Trên iPhone: Swipe up để xóa Expo Go khỏi app switcher
2. Hoặc trên Android: Close app completely

### **Step 3: Mở App Lại**
1. Mở Expo Go → Mở project
2. Check console logs theo thứ tự:

**Expected Flow (Success):**
```
🚀 [SplashScreen] App started, initializing auth...
🔐 [AuthStore] Starting auth initialization...
🔍 [AuthHelper] Reading tokens from SecureStore...
📖 [AuthHelper] Raw tokens from SecureStore: { hasAccessToken: true, hasRefreshToken: true, ... }
⏰ [AuthHelper] Token timing info: { currentTime: '...', expirationTime: '...', remainingDuration: '3600 seconds', isExpired: false }
✅ [AuthHelper] Successfully retrieved tokens
🔑 [AuthStore] Stored tokens from SecureStore: { hasAccessToken: true, hasRefreshToken: true, ... }
✅ [AuthStore] Found stored tokens, attempting to refresh...
🔄 [AuthStore] Starting token refresh...
📡 [AuthStore] Calling sessionService.refreshToken...
✅ [AuthStore] Token refresh API call successful
💾 [AuthStore] New tokens saved to SecureStore
🔄 [AuthStore] Token refresh completed successfully
👤 [AuthStore] User profile fetched, setting authenticated = true
🏁 [AuthStore] Auth initialization completed
🔄 [SplashScreen] Auth state changed: { isLoading: false, isAuthenticated: true }
✅ [SplashScreen] User is authenticated, navigating to main app
```

**Expected Flow (Failure):**
```
🚀 [SplashScreen] App started, initializing auth...
🔐 [AuthStore] Starting auth initialization...
🔍 [AuthHelper] Reading tokens from SecureStore...
📖 [AuthHelper] Raw tokens from SecureStore: { hasAccessToken: false, hasRefreshToken: false, ... }
❌ [AuthHelper] Missing access or refresh token
❌ [AuthStore] No stored tokens found, user needs to login
🏁 [AuthStore] Auth initialization completed
🔄 [SplashScreen] Auth state changed: { isLoading: false, isAuthenticated: false }
❌ [SplashScreen] User not authenticated, navigating to login
```

---

## 🔧 **Troubleshooting**

### **Problem 1: Tokens Not Saved**
**Symptoms:** `📖 [AuthHelper] Raw tokens from SecureStore: { hasAccessToken: false, hasRefreshToken: false, ... }`

**Possible Causes:**
- SecureStore không hoạt động trên device
- Login process failed trước khi save tokens
- App bị crash trước khi save tokens

**Debug Steps:**
1. Check login logs: `💾 [AuthHelper] Saving tokens to SecureStore`
2. Check save success: `✅ [AuthHelper] Tokens saved successfully to SecureStore`

### **Problem 2: Tokens Expired**
**Symptoms:** `⏰ [AuthHelper] Token timing info: { isExpired: true }`

**Possible Causes:**
- Token đã hết hạn (expiresIn quá ngắn)
- Device time không đúng
- API trả về expiresIn sai

**Debug Steps:**
1. Check expiration time: `expirationTime: '...'`
2. Check remaining duration: `remainingDuration: '0 seconds'`

### **Problem 3: Refresh Token Failed**
**Symptoms:** `❌ [AuthStore] Token refresh failed: [error]`

**Possible Causes:**
- Refresh token đã hết hạn
- API endpoint không hoạt động
- Network connection issues

**Debug Steps:**
1. Check API call: `📡 [AuthStore] Calling sessionService.refreshToken...`
2. Check API response: `✅ [AuthStore] Token refresh API call successful`

### **Problem 4: Profile Fetch Failed**
**Symptoms:** User authenticated nhưng profile không load

**Debug Steps:**
1. Check profile API call
2. Check user data in store

---

## 📱 **Test Scenarios**

### **Scenario 1: Fresh Install**
1. Uninstall app completely
2. Install và login
3. Check tokens được save
4. Tắt app → Mở lại
5. Should auto-login

### **Scenario 2: Token Expiry**
1. Login với token có expiresIn ngắn (1-2 phút)
2. Wait for token expiry
3. Tắt app → Mở lại
4. Should auto-login (refresh token)

### **Scenario 3: Network Issues**
1. Login thành công
2. Tắt WiFi/mobile data
3. Tắt app → Mở lại
4. Should show login screen (refresh failed)

### **Scenario 4: Invalid Refresh Token**
1. Login thành công
2. Manually clear refresh token từ SecureStore
3. Tắt app → Mở lại
4. Should show login screen

---

## 🎯 **Expected Results**

### **✅ Success Case:**
- User login một lần
- Tắt app hoàn toàn
- Mở app lại → Auto-login to main app
- Không cần nhập password lại

### **❌ Failure Case:**
- User login một lần
- Tắt app hoàn toàn
- Mở app lại → Redirect to login screen
- Cần nhập password lại

---

## 🔍 **Debug Commands**

### **Check Token Status:**
```typescript
import { AuthHelper } from './services/authHelper';

// Get detailed token info
const tokenInfo = await AuthHelper.getTokenInfo();
console.log('Token Info:', tokenInfo);
```

### **Check SecureStore:**
```typescript
import * as SecureStore from 'expo-secure-store';

// Check individual keys
const accessToken = await SecureStore.getItemAsync('accessToken');
const refreshToken = await SecureStore.getItemAsync('refreshToken');
console.log('Access Token:', accessToken ? '***' + accessToken.slice(-4) : 'null');
console.log('Refresh Token:', refreshToken ? '***' + refreshToken.slice(-4) : 'null');
```

### **Clear All Tokens:**
```typescript
import { AuthHelper } from './services/authHelper';

// Clear all tokens (for testing)
await AuthHelper.clearTokens();
console.log('All tokens cleared');
```

---

## 📊 **Performance Monitoring**

### **Key Metrics to Track:**
1. **Token Save Time:** Time từ login success đến save complete
2. **Token Read Time:** Time từ app start đến read complete
3. **Refresh Time:** Time từ refresh call đến success
4. **Auto-Login Time:** Total time từ app start đến main app

### **Expected Performance:**
- Token Save: < 100ms
- Token Read: < 50ms
- Token Refresh: < 500ms
- Auto-Login: < 2 seconds

---

## 🚀 **Next Steps**

1. **Test trên device thật** (không phải simulator)
2. **Test với network conditions khác nhau**
3. **Test với token expiry scenarios**
4. **Monitor performance metrics**
5. **Test edge cases** (app crash, network loss, etc.)

---

## 📝 **Notes**

- **SecureStore** chỉ hoạt động trên device thật, không hoạt động trên simulator
- **Token expiry** cần test với expiresIn ngắn
- **Network issues** cần test với offline/online scenarios
- **App lifecycle** cần test với different app states

---

**🎯 Mục tiêu: User login một lần → Tắt app → Mở lại → Auto-login thành công!**
