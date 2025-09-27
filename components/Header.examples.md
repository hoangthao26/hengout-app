# Header Component Usage Examples

## Basic Usage

```typescript
import Header from '../components/Header';

// Simple header with back button
<Header
    title="Settings"
    onBackPress={() => NavigationService.goBack()}
/>

// Header with right icon
<Header
    title="Profile"
    onBackPress={() => NavigationService.goBack()}
    rightIcon={{
        name: "settings-outline",
        size: 24,
        onPress: () => NavigationService.goToSettings()
    }}
/>

// Header without back button
<Header
    title="Home"
    showBackButton={false}
    rightIcon={{
        name: "notifications-outline",
        size: 26,
        onPress: () => NavigationService.goToNotifications()
    }}
/>
```

## Common Patterns

### Settings Screen
```typescript
<Header
    title="Cài đặt"
    onBackPress={() => NavigationService.goBack()}
/>
```

### Edit Profile Screen
```typescript
<Header
    title="Chỉnh sửa hồ sơ"
    onBackPress={() => NavigationService.goBack()}
    rightIcon={{
        name: "checkmark",
        size: 24,
        onPress: () => handleSave()
    }}
/>
```

### Search Screen
```typescript
<Header
    title="Tìm kiếm"
    onBackPress={() => NavigationService.goBack()}
    rightIcon={{
        name: "filter-outline",
        size: 24,
        onPress: () => showFilterModal()
    }}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| title | string | ✅ | - | Header title text |
| onBackPress | () => void | ❌ | - | Back button press handler |
| rightIcon | object | ❌ | - | Right icon configuration |
| showBackButton | boolean | ❌ | true | Show/hide back button |

### rightIcon Object

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| name | keyof Ionicons.glyphMap | ✅ | - | Icon name |
| size | number | ❌ | 28 | Icon size |
| onPress | () => void | ❌ | - | Icon press handler |
