# 🚀 Zustand State Management Guide

## 📋 Tổng quan

Ứng dụng đã được tích hợp **Zustand** để quản lý state một cách hiệu quả và best practice. Hệ thống bao gồm 5 stores chính:

## 🏪 Danh sách Stores

### 1. **AuthStore** - Quản lý Authentication
```typescript
import { useAuthStore } from '../store';

const { 
  isAuthenticated, 
  user, 
  tokens, 
  isLoading, 
  error,
  login, 
  logout, 
  googleSignIn,
  verifyOTP 
} = useAuthStore();
```

**Tính năng:**
- ✅ Login/Logout
- ✅ Google OAuth
- ✅ OTP Verification
- ✅ Token Management
- ✅ Auto Refresh Tokens
- ✅ Persistent Storage

### 2. **ProfileStore** - Quản lý User Profile
```typescript
import { useProfileStore } from '../store';

const { 
  profile, 
  isLoading, 
  isUpdating, 
  error,
  fetchProfile, 
  updateProfile, 
  uploadAvatar,
  initializeProfile 
} = useProfileStore();
```

**Tính năng:**
- ✅ Fetch Profile Data
- ✅ Update Profile
- ✅ Avatar Upload
- ✅ Profile Initialization
- ✅ Persistent Storage

### 3. **PreferencesStore** - Quản lý User Preferences
```typescript
import { usePreferencesStore } from '../store';

const { 
  preferences, 
  isLoading, 
  isUpdating, 
  error,
  fetchPreferences, 
  updatePreferences,
  updateCategoryTerms,
  updatePurposeTerms,
  updateTagTerms 
} = usePreferencesStore();
```

**Tính năng:**
- ✅ User Preferences
- ✅ Category Terms
- ✅ Purpose Terms
- ✅ Tag Terms
- ✅ Onboarding Data

### 4. **UIStore** - Quản lý UI State
```typescript
import { useUIStore } from '../store';

const { 
  toast, 
  modal, 
  loading, 
  theme,
  showToast, 
  hideToast,
  showModal, 
  hideModal,
  setLoading,
  setTheme 
} = useUIStore();
```

**Tính năng:**
- ✅ Toast Notifications
- ✅ Modal Management
- ✅ Loading States
- ✅ Theme Management
- ✅ Global UI State

### 5. **SearchStore** - Quản lý Search & Discovery
```typescript
import { useSearchStore } from '../store';

const { 
  searchResults, 
  searchFilters, 
  isLoading, 
  error,
  searchUsers, 
  loadMoreResults,
  getRecommendedUsers,
  getNearbyUsers 
} = useSearchStore();
```

**Tính năng:**
- ✅ User Search
- ✅ Search Filters
- ✅ Pagination
- ✅ Recommendations
- ✅ Nearby Users

## 🎯 Cách sử dụng trong Components

### **Ví dụ 1: Authentication**
```typescript
import { useAuthStore } from '../store';

export default function LoginScreen() {
  const { login, isLoading, error } = useAuthStore();
  
  const handleLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
      // Navigate to main app
    } catch (error) {
      // Handle error
    }
  };
  
  return (
    // Your UI
  );
}
```

### **Ví dụ 2: Profile Management**
```typescript
import { useProfileStore } from '../store';

export default function ProfileScreen() {
  const { profile, fetchProfile, updateProfile } = useProfileStore();
  
  useEffect(() => {
    fetchProfile();
  }, []);
  
  const handleUpdateName = async (name: string) => {
    await updateProfile({ displayName: name });
  };
  
  return (
    // Your UI
  );
}
```

### **Ví dụ 3: UI State Management**
```typescript
import { useUIStore } from '../store';

export default function MyComponent() {
  const { showToast, showModal, setLoading } = useUIStore();
  
  const handleAction = async () => {
    setLoading(true, 'Processing...');
    try {
      // Do something
      showToast('success', 'Action completed!');
    } catch (error) {
      showToast('error', 'Action failed!');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    // Your UI
  );
}
```

## 🔧 Best Practices

### **1. Selective State Subscription**
```typescript
// ✅ Good - Only subscribe to needed state
const { profile } = useProfileStore(state => ({ profile: state.profile }));

// ❌ Bad - Subscribe to entire store
const profileStore = useProfileStore();
```

### **2. Error Handling**
```typescript
const { updateProfile, error, clearError } = useProfileStore();

useEffect(() => {
  if (error) {
    showToast('error', error);
    clearError();
  }
}, [error]);
```

### **3. Loading States**
```typescript
const { isLoading, isUpdating } = useProfileStore();

if (isLoading) return <LoadingSpinner />;
if (isUpdating) return <UpdatingSpinner />;
```

### **4. Persistent Storage**
```typescript
// Stores automatically persist to AsyncStorage
// Only specified fields are persisted (see partialize in each store)
```

## 📱 Integration với Existing Components

### **Đã tích hợp:**
- ✅ `edit-date-of-birth.tsx` - Sử dụng ProfileStore + UIStore
- ✅ `edit-profile.tsx` - Sử dụng ProfileStore + UIStore

### **Cần tích hợp:**
- 🔄 `auth/login.tsx` - Sử dụng AuthStore
- 🔄 `auth/signup.tsx` - Sử dụng AuthStore
- 🔄 `auth/onboarding-wizard.tsx` - Sử dụng PreferencesStore
- 🔄 `(tabs)/profile.tsx` - Sử dụng ProfileStore
- 🔄 `(tabs)/discover.tsx` - Sử dụng SearchStore

## 🚀 Lợi ích

### **1. Performance**
- ✅ Selective re-renders
- ✅ No unnecessary API calls
- ✅ Optimized state updates

### **2. Developer Experience**
- ✅ TypeScript support
- ✅ DevTools integration
- ✅ Simple API
- ✅ No boilerplate

### **3. User Experience**
- ✅ Persistent state
- ✅ Offline support
- ✅ Fast navigation
- ✅ Consistent state

### **4. Maintainability**
- ✅ Centralized state
- ✅ Predictable updates
- ✅ Easy testing
- ✅ Clear separation of concerns

## 🔄 Migration từ Context API

### **Trước (Context):**
```typescript
const { showToast } = useToast();
const [loading, setLoading] = useState(false);
const [profile, setProfile] = useState(null);
```

### **Sau (Zustand):**
```typescript
const { showToast } = useUIStore();
const { profile, isLoading, fetchProfile } = useProfileStore();
```

## 📚 Tài liệu tham khảo

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Zustand with TypeScript](https://github.com/pmndrs/zustand#typescript)
- [Zustand Persist](https://github.com/pmndrs/zustand#persist)

---

**🎉 Chúc mừng! Bạn đã có một hệ thống state management hoàn chỉnh và best practice!**
