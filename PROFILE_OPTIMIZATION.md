# 🚀 Profile Optimization - Không cần gọi API nữa!

## 📋 Tình trạng sau khi cải thiện

### **✅ Trước (có vấn đề):**
```typescript
// Login → AuthStore có profile data
// Vào Profile Screen → Vẫn gọi API lại ❌
```

### **✅ Sau (đã tối ưu):**
```typescript
// Login → AuthStore + ProfileStore đều có data
// Vào Profile Screen → Không gọi API nữa ✅
```

## 🔄 Flow hoàn chỉnh

### **1. User Login:**
```typescript
const { login } = useAuthStore();

await login(email, password);
// ✅ Tự động:
// 1. Fetch profile từ API
// 2. Update AuthStore.user
// 3. Update ProfileStore.profile
// 4. Lưu vào AsyncStorage
```

### **2. Vào Profile Screen:**
```typescript
const { profile, fetchProfile } = useProfileStore();

useEffect(() => {
  fetchProfile(); // ✅ Kiểm tra: đã có profile chưa?
  // Nếu có → Skip API call
  // Nếu chưa → Gọi API
}, []);
```

## 🎯 State sau Login

### **AuthStore:**
```typescript
{
  isAuthenticated: true,
  user: {
    displayName: 'John Doe',     // ✅ Từ profile API
    avatarUrl: 'https://...',    // ✅ Từ profile API
    role: 'USER'
  },
  tokens: { accessToken: '...', refreshToken: '...' }
}
```

### **ProfileStore:**
```typescript
{
  profile: {
    displayName: 'John Doe',     // ✅ Cùng data với AuthStore
    gender: 'MALE',
    dateOfBirth: '1990-01-01',
    avatarUrl: 'https://...',    // ✅ Cùng data với AuthStore
    bio: 'Hello world!',
    categoryTerms: ['cafe'],
    purposeTerms: ['dating'],
    tagTerms: ['foodie']
  },
  isLoading: false,
  isUpdating: false
}
```

## 📱 Sử dụng trong Components

### **Profile Screen (Không cần gọi API):**
```typescript
const ProfileScreen = () => {
  const { profile, isLoading } = useProfileStore();
  
  useEffect(() => {
    fetchProfile(); // ✅ Smart fetch - chỉ gọi API nếu chưa có data
  }, []);
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <View>
      <Text>{profile?.displayName}</Text>
      <Image source={{ uri: profile?.avatarUrl }} />
      <Text>{profile?.bio}</Text>
    </View>
  );
};
```

### **Edit Profile Screen:**
```typescript
const EditProfileScreen = () => {
  const { profile, updateProfile } = useProfileStore();
  
  const handleUpdate = async (updates) => {
    await updateProfile(updates);
    // ✅ Tự động update cả AuthStore và ProfileStore
  };
  
  return (
    // Form với profile data đã có sẵn
  );
};
```

## 🔧 Smart Fetching Logic

### **ProfileStore.fetchProfile():**
```typescript
fetchProfile: async () => {
  // ✅ Kiểm tra đã có profile chưa
  const currentProfile = get().profile;
  if (currentProfile) {
    console.log('📱 Profile already exists, skipping fetch');
    return; // Không gọi API
  }
  
  // Chỉ gọi API nếu chưa có data
  const response = await ProfileService.getUserProfile();
  set({ profile: response.data });
}
```

### **AuthStore.fetchUserProfile():**
```typescript
fetchUserProfile: async () => {
  const response = await ProfileService.getUserProfile();
  const profileData = response.data;
  
  // Update AuthStore
  set({ user: { ...user, displayName: profileData.displayName } });
  
  // ✅ Sync với ProfileStore
  const profileStore = useProfileStore.getState();
  profileStore.setProfile(profileData);
}
```

## 🚀 Lợi ích

### **1. Performance:**
- ✅ Giảm API calls không cần thiết
- ✅ Faster navigation
- ✅ Better user experience

### **2. Data Consistency:**
- ✅ AuthStore và ProfileStore luôn sync
- ✅ Không có duplicate data
- ✅ Single source of truth

### **3. Offline Support:**
- ✅ Profile data được persist
- ✅ Hoạt động offline
- ✅ Fast app startup

## 📊 So sánh

### **Trước:**
```
Login → API call (profile)
Vào Profile → API call (profile) ❌ Duplicate
Vào Edit Profile → API call (profile) ❌ Duplicate
```

### **Sau:**
```
Login → API call (profile) → Sync 2 stores
Vào Profile → No API call ✅
Vào Edit Profile → No API call ✅
```

## 🔄 Khi nào vẫn gọi API?

### **Chỉ gọi API khi:**
- ✅ Lần đầu login (chưa có profile)
- ✅ App khởi động (restore session)
- ✅ Manual refresh
- ✅ Update profile (cần sync với server)

### **Không gọi API khi:**
- ✅ Vào profile screen (đã có data)
- ✅ Navigate giữa các screens
- ✅ App resume từ background

---

**🎉 Bây giờ profile system đã được tối ưu hoàn toàn - không còn duplicate API calls!**
