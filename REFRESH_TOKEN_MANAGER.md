# 🔥 Refresh Token Manager

## 📋 **Tổng quan**

`RefreshTokenManager` là service consolidated thay thế cho `tokenRefreshManager.ts` và `tokenRefreshService.ts` cũ, cung cấp enterprise-grade token refresh với các tính năng:

- ✅ **Proactive refresh** (5-10 phút trước khi hết hạn)
- ✅ **App resume refresh** (khi app foreground)
- ✅ **Lazy refresh** (401 fallback)
- ✅ **Token rotation** support
- ✅ **Smart error handling** với retry
- ✅ **Exponential backoff**
- ✅ **Network error resilience**

---

## 🚀 **Cách sử dụng**

### **1. Import và khởi tạo**
```typescript
import { refreshTokenManager } from '../services/refreshTokenManager';

// Singleton instance - tự động khởi tạo
const manager = refreshTokenManager;
```

### **2. Start monitoring (tự động)**
```typescript
// Được gọi tự động trong authStore.initializeAuth()
await refreshTokenManager.startMonitoring();
```

### **3. Force refresh (manual)**
```typescript
// Force refresh ngay lập tức
const success = await refreshTokenManager.forceRefresh();
```

### **4. Get status**
```typescript
const status = await refreshTokenManager.getRefreshStatus();
console.log('Status:', {
    isMonitoring: status.isMonitoring,
    isRefreshing: status.isRefreshing,
    timeUntilRefresh: status.timeUntilRefresh,
    isAuthenticated: status.isAuthenticated
});
```

### **5. Stop monitoring**
```typescript
// Được gọi tự động trong authStore.logout()
refreshTokenManager.stopMonitoring();
```

---

## 🔧 **Configuration**

```typescript
// Trong RefreshTokenManager class
private static readonly REFRESH_BEFORE_EXPIRY = 5 * 60 * 1000; // 5 phút trước
private static readonly MIN_REFRESH_INTERVAL = 60 * 1000; // Tối thiểu 1 phút
private static readonly MAX_RETRY_ATTEMPTS = 3; // Tối đa 3 lần retry
private static readonly RETRY_BACKOFF_BASE = 1000; // 1 giây base delay
```

---

## 🎯 **Features**

### **🔄 Proactive Refresh**
- Tự động refresh token 5 phút trước khi hết hạn
- Tránh 401 errors cho user
- Background refresh - invisible to user

### **📱 App Resume Refresh**
- Tự động check token khi app foreground
- Refresh nếu token sắp hết hạn (< 10 phút)
- Sử dụng AppState listener

### **🛡️ Smart Error Handling**
```typescript
// Error classification
- AUTHENTICATION_ERROR: Logout user
- NETWORK_ERROR: Retry with backoff
- UNKNOWN_ERROR: Keep user logged in
```

### **⏰ Exponential Backoff**
```typescript
// Retry delays: 1s, 2s, 4s
const backoffDelay = RETRY_BACKOFF_BASE * Math.pow(2, attempt - 1);
```

---

## 🔗 **Integration**

### **AuthStore Integration**
```typescript
// store/authStore.ts
import { refreshTokenManager } from '../services/refreshTokenManager';

// Start monitoring after successful auth
await refreshTokenManager.startMonitoring();

// Stop monitoring on logout
refreshTokenManager.stopMonitoring();

// Use for token refresh
const success = await refreshTokenManager.performRefresh();
```

### **Axios Integration**
```typescript
// config/axios.ts
import { refreshTokenManager } from '../services/refreshTokenManager';

// 401 interceptor
await refreshTokenManager.forceRefresh();
```

---

## 🧪 **Testing**

```typescript
import { testRefreshTokenManager } from '../services/refreshTokenManager.test';

// Run all tests
await testRefreshTokenManager.runAllTests();

// Individual tests
await testRefreshTokenManager.testStartMonitoring();
await testRefreshTokenManager.testForceRefresh();
await testRefreshTokenManager.testGetRefreshStatus();
```

---

## 📊 **Monitoring**

### **Console Logs**
```
🚀 [RefreshTokenManager] Starting token monitoring...
⏰ [RefreshTokenManager] Scheduling proactive refresh in 1800 seconds
🔄 [RefreshTokenManager] Starting token refresh...
✅ [RefreshTokenManager] Token refresh successful
📱 [RefreshTokenManager] App resumed - checking token refresh
```

### **Status Information**
```typescript
const status = await refreshTokenManager.getRefreshStatus();
// Returns:
{
    isMonitoring: boolean,
    isRefreshing: boolean,
    timeUntilRefresh: number,
    lastRefreshTime: number,
    isAuthenticated: boolean,
    tokenExpiryTime: number
}
```

---

## 🚨 **Troubleshooting**

### **Common Issues**

1. **Token refresh fails**
   - Check network connection
   - Verify refresh token is valid
   - Check backend refresh endpoint

2. **App resume not working**
   - Verify AppState listener is set up
   - Check if monitoring is started

3. **Multiple refresh attempts**
   - Check MIN_REFRESH_INTERVAL setting
   - Verify isRefreshing flag

### **Debug Mode**
```typescript
// Enable detailed logging
console.log('RefreshTokenManager status:', await refreshTokenManager.getRefreshStatus());
```

---

## 🔄 **Migration từ services cũ**

### **Trước (2 services)**
```typescript
// tokenRefreshManager.ts - Proactive refresh
// tokenRefreshService.ts - Background refresh
```

### **Sau (1 service)**
```typescript
// refreshTokenManager.ts - Consolidated service
```

### **Benefits**
- ✅ Single source of truth
- ✅ Better error handling
- ✅ App resume support
- ✅ Cleaner code structure
- ✅ Easier maintenance

---

## 🎯 **Next Steps**

1. **Phase 1**: ✅ Consolidate refresh services
2. **Phase 2**: 🔄 Fix token expiry storage (timestamp)
3. **Phase 3**: 🔄 Enhanced error handling
4. **Phase 4**: 🔄 Performance optimization

---

## 📝 **Notes**

- Service sử dụng singleton pattern
- Tự động cleanup resources khi destroy
- Thread-safe với proper locking
- Enterprise-grade error handling
- Compatible với existing auth flow
