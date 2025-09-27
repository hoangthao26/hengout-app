# 🚪 Logout Best Practice - Implementation Guide

## 📊 **SO SÁNH IMPLEMENTATION:**

### **❌ Discover Screen (Before Fix - INCOMPLETE):**
```typescript
// Imports
import { AuthHelper } from '../../services/authHelper';

// Logout function
const handleLogout = async () => {
    try {
        await AuthHelper.logout();
        console.log('Logout successful');           // ❌ Only console log
    } catch (error: any) {
        console.error('Logout failed:', error);     // ❌ Only console log
    }
};
```

### **✅ Chat Screen (BEST PRACTICE):**
```typescript
// Imports
import { useToast } from '../../contexts/ToastContext';
import NavigationService from '../../services/navigationService';

// Logout function
const handleLogout = async () => {
    try {
        await AuthHelper.logout();
        success('Đã đăng xuất thành công');        // ✅ Toast notification
        NavigationService.logoutToLogin();          // ✅ Navigation service
    } catch (error: any) {
        console.error('Logout failed:', error);
        error('Đăng xuất thất bại');               // ✅ Error toast
    }
};
```

### **✅ Discover Screen (After Fix - BEST PRACTICE):**
```typescript
// Imports
import { useToast } from '../../contexts/ToastContext';
import NavigationService from '../../services/navigationService';

// Logout function
const handleLogout = async () => {
    try {
        await AuthHelper.logout();
        success('Đã đăng xuất thành công');        // ✅ Toast notification
        NavigationService.logoutToLogin();          // ✅ Navigation service
    } catch (error: any) {
        console.error('Logout failed:', error);
        error('Đăng xuất thất bại');               // ✅ Error toast
    }
};
```

---

## 🏆 **BEST PRACTICE COMPONENTS:**

### **1. ✅ Toast Notifications**
```typescript
const { success, error, info, warning, loading, hideLoading } = useToast();

// Success case
success('Đã đăng xuất thành công');

// Error case
error('Đăng xuất thất bại');
```

**Benefits:**
- **User Feedback** - User knows what happened
- **Professional UX** - Consistent with app design
- **Error Communication** - Clear error messages

### **2. ✅ Navigation Service**
```typescript
import NavigationService from '../../services/navigationService';

// Navigate to login screen
NavigationService.logoutToLogin();
```

**Benefits:**
- **Consistent Navigation** - Same behavior across app
- **Centralized Logic** - Single source of truth
- **Proper Flow** - Complete logout experience

### **3. ✅ Error Handling**
```typescript
try {
    await AuthHelper.logout();
    success('Đã đăng xuất thành công');
    NavigationService.logoutToLogin();
} catch (error: any) {
    console.error('Logout failed:', error);
    error('Đăng xuất thất bại');
}
```

**Benefits:**
- **Graceful Failure** - Handle errors properly
- **User Communication** - Inform user of issues
- **Debugging** - Console logs for developers

### **4. ✅ Confirmation Dialog**
```typescript
Alert.alert(
    'Đăng xuất',
    'Bạn có chắc chắn muốn đăng xuất?',
    [
        {
            text: 'Hủy',
            style: 'cancel',
        },
        {
            text: 'Đăng xuất',
            style: 'destructive',
            onPress: async () => {
                // Logout logic
            },
        },
    ]
);
```

**Benefits:**
- **Prevent Accidental Logout** - User confirmation
- **Clear Options** - Cancel or proceed
- **Destructive Style** - Visual warning

---

## 🔄 **COMPLETE LOGOUT FLOW:**

### **Step 1: User Clicks Logout**
```typescript
<TouchableOpacity onPress={handleLogout}>
    <Text>Logout</Text>
</TouchableOpacity>
```

### **Step 2: Confirmation Dialog**
```typescript
Alert.alert(
    'Đăng xuất',
    'Bạn có chắc chắn muốn đăng xuất?',
    [cancelButton, confirmButton]
);
```

### **Step 3: Logout Process**
```typescript
try {
    await AuthHelper.logout();  // Clear tokens, call API
    success('Đã đăng xuất thành công');
    NavigationService.logoutToLogin();
} catch (error) {
    error('Đăng xuất thất bại');
}
```

### **Step 4: Navigation**
```typescript
NavigationService.logoutToLogin(); // Navigate to login screen
```

---

## 📱 **USER EXPERIENCE COMPARISON:**

### **❌ Before (Discover Screen - Poor UX):**
1. User clicks logout
2. Confirmation dialog appears
3. User confirms
4. **Silent logout** - No feedback
5. **No navigation** - User stays on same screen
6. **Confusing** - User doesn't know what happened

### **✅ After (Best Practice - Great UX):**
1. User clicks logout
2. Confirmation dialog appears
3. User confirms
4. **Success toast** - "Đã đăng xuất thành công"
5. **Navigation** - Redirected to login screen
6. **Clear feedback** - User knows what happened

---

## 🔧 **IMPLEMENTATION DETAILS:**

### **Required Imports:**
```typescript
import { useToast } from '../../contexts/ToastContext';
import NavigationService from '../../services/navigationService';
import { AuthHelper } from '../../services/authHelper';
```

### **Toast Hook:**
```typescript
const { success, error, info, warning, loading, hideLoading } = useToast();
```

### **Logout Function:**
```typescript
const handleLogout = async () => {
    Alert.alert(
        'Đăng xuất',
        'Bạn có chắc chắn muốn đăng xuất?',
        [
            {
                text: 'Hủy',
                style: 'cancel',
            },
            {
                text: 'Đăng xuất',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await AuthHelper.logout();
                        success('Đã đăng xuất thành công');
                        NavigationService.logoutToLogin();
                    } catch (error: any) {
                        console.error('Logout failed:', error);
                        error('Đăng xuất thất bại');
                    }
                },
            },
        ]
    );
};
```

---

## 🎯 **BEST PRACTICE CHECKLIST:**

### **✅ Required Components:**
- [ ] **Toast Notifications** - User feedback
- [ ] **Navigation Service** - Proper navigation
- [ ] **Error Handling** - Graceful failure
- [ ] **Confirmation Dialog** - Prevent accidental logout
- [ ] **Loading States** - Show progress (optional)
- [ ] **Consistent Styling** - Match app design

### **✅ User Experience:**
- [ ] **Clear Feedback** - User knows what happened
- [ ] **Smooth Navigation** - Proper flow
- [ ] **Error Communication** - Clear error messages
- [ ] **Confirmation** - Prevent accidental actions
- [ ] **Professional Feel** - Consistent with app

### **✅ Technical Implementation:**
- [ ] **Async/Await** - Proper async handling
- [ ] **Try/Catch** - Error handling
- [ ] **Console Logs** - Debugging information
- [ ] **Type Safety** - TypeScript support
- [ ] **Consistent Imports** - Same pattern across app

---

## 🚀 **PERFORMANCE CONSIDERATIONS:**

### **1. Toast Duration:**
```typescript
success('Đã đăng xuất thành công'); // 2 seconds (default)
error('Đăng xuất thất bại');        // 3 seconds (default)
```

### **2. Navigation Timing:**
```typescript
// Navigate after toast shows
success('Đã đăng xuất thành công');
NavigationService.logoutToLogin(); // Immediate navigation
```

### **3. Error Handling:**
```typescript
// Don't navigate on error
catch (error: any) {
    console.error('Logout failed:', error);
    error('Đăng xuất thất bại');
    // No navigation - user stays on current screen
}
```

---

## 🔍 **TESTING SCENARIOS:**

### **1. Successful Logout:**
1. Click logout button
2. Confirm in dialog
3. **Expected:** Success toast + navigation to login

### **2. Cancelled Logout:**
1. Click logout button
2. Cancel in dialog
3. **Expected:** Stay on current screen

### **3. Failed Logout:**
1. Click logout button
2. Confirm in dialog
3. **Expected:** Error toast + stay on current screen

### **4. Network Issues:**
1. Turn off network
2. Try logout
3. **Expected:** Error toast + stay on current screen

---

## 🎉 **CONCLUSION:**

**✅ Chat Screen implementation is BEST PRACTICE**

### **Key Features:**
1. **✅ Toast Notifications** - User feedback
2. **✅ Navigation Service** - Proper navigation
3. **✅ Error Handling** - Graceful failure
4. **✅ Confirmation Dialog** - Prevent accidental logout
5. **✅ Complete Flow** - Full logout experience

### **Discover Screen Fixed:**
- **Before:** Incomplete logout (no feedback, no navigation)
- **After:** Best practice implementation (same as Chat Screen)

### **Benefits:**
- **Consistent UX** - Same behavior across app
- **Professional Feel** - Proper user feedback
- **Error Handling** - Graceful failure management
- **Complete Flow** - Full logout experience

**🚀 Both screens now follow the same best practice pattern!**
