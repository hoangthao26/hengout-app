# 🔐 Authentication Flow với Zustand

## 📋 Flow đăng nhập hoàn chỉnh

### **1. User đăng nhập**
```typescript
import { useAuthStore } from '../store';

const LoginScreen = () => {
  const { login, isLoading, isAuthenticated, user } = useAuthStore();
  
  const handleLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
      // ✅ Tự động:
      // 1. Lưu tokens vào AsyncStorage
      // 2. Set isAuthenticated = true
      // 3. Fetch user profile
      // 4. Update user data với profile info
      
      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error) {
      // Handle error
    }
  };
};
```

### **2. App khởi động - Auto login**
```typescript
import { useAuthStore } from '../store';

const App = () => {
  const { initializeAuth, isLoading, isAuthenticated } = useAuthStore();
  
  useEffect(() => {
    initializeAuth();
    // ✅ Tự động:
    // 1. Kiểm tra stored tokens
    // 2. Refresh tokens nếu cần
    // 3. Fetch user profile
    // 4. Set authentication state
  }, []);
  
  if (isLoading) return <LoadingScreen />;
  
  return isAuthenticated ? <MainApp /> : <AuthStack />;
};
```

## 🎯 State sau khi đăng nhập

### **AuthStore State:**
```typescript
{
  isAuthenticated: true,
  isLoading: false,
  user: {
    id: '',
    email: '',
    displayName: 'John Doe',        // ✅ Từ profile
    avatarUrl: 'https://...',       // ✅ Từ profile
    role: 'USER'
  },
  tokens: {
    accessToken: 'eyJhbGciOiJIUzI1NiIs...',
    refreshToken: 'eyJhbGciOiJIUzI1NiIs...'
  },
  error: null
}
```

### **ProfileStore State:**
```typescript
{
  profile: {
    displayName: 'John Doe',
    gender: 'MALE',
    dateOfBirth: '1990-01-01',
    avatarUrl: 'https://...',
    bio: 'Hello world!',
    categoryTerms: ['cafe', 'restaurant'],
    purposeTerms: ['dating', 'friendship'],
    tagTerms: ['foodie', 'traveler']
  },
  isLoading: false,
  isUpdating: false,
  error: null
}
```

## 🔄 Các bước xảy ra khi login

### **Step 1: Login API Call**
```typescript
const response = await AuthService.loginUser(email, password);
// Response: { accessToken, refreshToken, tokenType, expiresIn, role }
```

### **Step 2: Store Tokens**
```typescript
await AuthHelper.saveTokens({
  accessToken: response.data.accessToken,
  refreshToken: response.data.refreshToken,
  tokenType: response.data.tokenType,
  expiresIn: response.data.expiresIn,
  role: response.data.role,
});
```

### **Step 3: Update Auth State**
```typescript
set({
  isAuthenticated: true,
  user: {
    id: '',
    email: '',
    displayName: undefined,
    avatarUrl: undefined,
    role: response.data.role,
  },
  tokens: {
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
  },
  isLoading: false,
});
```

### **Step 4: Fetch Profile (Tự động)**
```typescript
const response = await ProfileService.getUserProfile();
const profileData = response.data;

set({
  user: {
    id: '',
    email: '',
    displayName: profileData.displayName,    // ✅ Updated
    avatarUrl: profileData.avatarUrl,        // ✅ Updated
    role: get().user?.role || 'USER',
  },
});
```

## 🚀 Lợi ích

### **1. Tự động hóa**
- ✅ Không cần manually fetch profile sau login
- ✅ Tự động refresh tokens
- ✅ Tự động restore session khi app khởi động

### **2. State Management**
- ✅ Centralized auth state
- ✅ Persistent storage
- ✅ Real-time updates

### **3. User Experience**
- ✅ Seamless login flow
- ✅ Fast app startup
- ✅ Consistent state across screens

## 📱 Sử dụng trong Components

### **Check Authentication:**
```typescript
const { isAuthenticated, user } = useAuthStore();

if (!isAuthenticated) {
  return <LoginScreen />;
}

return <WelcomeScreen user={user} />;
```

### **Access User Data:**
```typescript
const { user } = useAuthStore();

return (
  <View>
    <Text>Welcome, {user?.displayName}!</Text>
    <Image source={{ uri: user?.avatarUrl }} />
  </View>
);
```

### **Logout:**
```typescript
const { logout } = useAuthStore();

const handleLogout = async () => {
  await logout();
  // ✅ Tự động:
  // 1. Clear tokens
  // 2. Set isAuthenticated = false
  // 3. Clear user data
  // 4. Navigate to login
};
```

## 🔧 Error Handling

### **Login Errors:**
```typescript
const { login, error, clearError } = useAuthStore();

useEffect(() => {
  if (error) {
    showToast('error', error);
    clearError();
  }
}, [error]);
```

### **Profile Fetch Errors:**
```typescript
// Profile fetch errors không break auth flow
// Chỉ log error và tiếp tục
console.error('Failed to fetch user profile:', error);
```

---

**🎉 Bây giờ hệ thống authentication đã hoàn chỉnh với auto profile fetching!**
