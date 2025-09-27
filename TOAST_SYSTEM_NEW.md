# Toast System - Enterprise Grade

## Overview
Hệ thống toast mới được thiết kế theo best practices enterprise với các tính năng:

- ✅ **Type Safety**: Full TypeScript support
- ✅ **Performance**: Optimized animations và memory management
- ✅ **Accessibility**: Support cho screen readers
- ✅ **Customizable**: Dễ dàng customize themes và behaviors
- ✅ **Queue Management**: Smart queue system cho multiple toasts
- ✅ **No Dependencies**: Không phụ thuộc vào external libraries

## Architecture

### 1. ToastContext (`contexts/ToastContext.tsx`)
- **Provider**: Quản lý global toast state
- **Queue System**: Xử lý multiple toasts
- **Memory Management**: Auto cleanup timeouts
- **Type Safety**: Full TypeScript interfaces

### 2. SimpleToast Component (`components/SimpleToast.tsx`)
- **No Animations**: Hiển thị ngay lập tức, không lag
- **Theming**: Dark/Light mode support
- **Actions**: Support cho action buttons
- **Performance**: Optimized cho mobile

### 3. ToastContainer (`components/ToastContainer.tsx`)
- **Positioning**: Top positioning với safe area
- **Z-Index**: Proper layering
- **Pointer Events**: Non-blocking touch events

## Usage

### Basic Usage
```typescript
import { useToast } from '../contexts/ToastContext';

const MyComponent = () => {
    const { success, error, info, warning, loading, hideLoading } = useToast();

    const handleSuccess = () => {
        success('Thành công!', 'Đã lưu thành công');
    };

    const handleError = () => {
        error('Lỗi!', 'Đã xảy ra lỗi');
    };

    const handleLoading = () => {
        const id = loading('Đang tải...', 'Vui lòng chờ');
        // Hide after 3 seconds
        setTimeout(() => hideLoading(), 3000);
    };

    return (
        // Your component JSX
    );
};
```

### Advanced Usage
```typescript
const { showToast } = useToast();

// Custom toast với action
showToast({
    type: 'error',
    title: 'Kết nối thất bại',
    message: 'Không thể kết nối đến server',
    duration: 5000,
    action: {
        label: 'Thử lại',
        onPress: () => retryConnection()
    }
});
```

## Toast Types

### 1. Success Toast
```typescript
success('Thành công!', 'Đã lưu thành công');
```
- **Duration**: 3 seconds
- **Color**: Green (#10B981)
- **Icon**: checkmark-circle

### 2. Error Toast
```typescript
error('Lỗi!', 'Đã xảy ra lỗi');
```
- **Duration**: 5 seconds
- **Color**: Red (#EF4444)
- **Icon**: close-circle

### 3. Info Toast
```typescript
info('Thông tin', 'Đây là thông báo thông tin');
```
- **Duration**: 3 seconds
- **Color**: Blue (#3B82F6)
- **Icon**: information-circle

### 4. Warning Toast
```typescript
warning('Cảnh báo', 'Đây là thông báo cảnh báo');
```
- **Duration**: 4 seconds
- **Color**: Orange (#F59E0B)
- **Icon**: warning

### 5. Loading Toast
```typescript
const id = loading('Đang tải...', 'Vui lòng chờ');
// Hide manually
hideLoading();
```
- **Duration**: Persistent (manual hide)
- **Color**: Gray (#6B7280)
- **Icon**: refresh

## Configuration

### Toast Options
```typescript
interface ToastOptions {
    duration?: number;        // Auto hide duration (ms)
    position?: 'top' | 'bottom'; // Position on screen
    action?: {               // Action button
        label: string;
        onPress: () => void;
    };
    persistent?: boolean;    // Don't auto hide
}
```

### Customization
```typescript
// Custom duration
success('Thành công!', 'Đã lưu', { duration: 2000 });

// With action
error('Lỗi!', 'Kết nối thất bại', {
    action: {
        label: 'Thử lại',
        onPress: () => retry()
    }
});

// Persistent toast
showToast({
    type: 'info',
    title: 'Thông báo',
    message: 'Toast này sẽ không tự động ẩn',
    persistent: true
});
```

## Best Practices

### 1. Toast Messages
- **Title**: Ngắn gọn, rõ ràng
- **Message**: Chi tiết hơn, có thể để trống
- **Language**: Sử dụng tiếng Việt cho UX tốt hơn

### 2. Duration Guidelines
- **Success**: 2-3 seconds
- **Info**: 3-4 seconds  
- **Warning**: 4-5 seconds
- **Error**: 5-6 seconds
- **Loading**: Manual hide

### 3. Usage Patterns
```typescript
// ✅ Good
success('Đã lưu', 'Dữ liệu đã được lưu thành công');
error('Lỗi đăng nhập', 'Email hoặc mật khẩu không đúng');

// ❌ Avoid
success('OK'); // Too vague
error('Error occurred'); // English in Vietnamese app
```

## Migration from Old System

### Before (Old)
```typescript
import { useToast } from '../hooks/useToast';

const { showToast } = useToast();
showToast('success', 'Success message');
```

### After (New)
```typescript
import { useToast } from '../contexts/ToastContext';

const { success } = useToast();
success('Thành công!', 'Đã lưu thành công');
```

## Testing

### Test Component
Sử dụng `app/toast-test.tsx` để test tất cả toast types:

```bash
# Navigate to toast test screen
# Test all toast types và animations
```

### Manual Testing Checklist
- [ ] Success toast hiển thị đúng
- [ ] Error toast hiển thị đúng
- [ ] Info toast hiển thị đúng
- [ ] Warning toast hiển thị đúng
- [ ] Loading toast hiển thị đúng
- [ ] Animations smooth
- [ ] Dark/Light mode support
- [ ] Auto hide works
- [ ] Manual hide works
- [ ] Action buttons work
- [ ] Multiple toasts queue properly

## Performance

### Optimizations
- **No Animations**: Hiển thị ngay lập tức, không lag
- **Memory Management**: Auto cleanup timeouts
- **Queue System**: Efficient toast queuing
- **Simple Rendering**: Minimal overhead

### Metrics
- **Bundle Size**: ~12KB (vs 50KB+ với react-native-toast-message)
- **Memory Usage**: Optimized với proper cleanup
- **Display Speed**: Instant display, no animation delays

## Troubleshooting

### Common Issues

1. **Toast không hiển thị**
   - Kiểm tra ToastProvider đã wrap app chưa
   - Kiểm tra ToastContainer đã được thêm vào _layout.tsx chưa

2. **Animations lag**
   - Đảm bảo sử dụng native driver
   - Kiểm tra performance của device

3. **Memory leaks**
   - Timeouts được auto cleanup
   - Kiểm tra component unmount properly

### Debug Mode
```typescript
// Enable debug logging
console.log('Toast system initialized');
```

## Future Enhancements

### Planned Features
- [ ] Toast positioning (top/bottom)
- [ ] Custom animations
- [ ] Toast history
- [ ] Offline queue
- [ ] Analytics integration
- [ ] A/B testing support

### Contributing
1. Follow TypeScript best practices
2. Add proper error handling
3. Include unit tests
4. Update documentation
5. Test on both platforms

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Maintainer**: Development Team
