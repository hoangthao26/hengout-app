# Chat Service Documentation

## Overview
Chat service được thiết kế để tích hợp với social-service API, cung cấp đầy đủ chức năng chat bao gồm conversations, messages, và member management.

## Files Created

### 1. Types (`types/chat.ts`)
- **ChatMessage**: Định nghĩa cấu trúc tin nhắn
- **ChatConversation**: Định nghĩa cấu trúc cuộc trò chuyện
- **ChatMember**: Định nghĩa cấu trúc thành viên
- **Request/Response Types**: Các interface cho API requests và responses
- **Note**: API endpoints được cấu hình trong `config/services.ts` dưới `SOCIAL_SERVICE`

### 2. Service (`services/chatService.ts`)
- **ChatService Class**: Singleton service với tất cả API methods
- **Base URL**: Sử dụng `SERVICES_CONFIG.SOCIAL_SERVICE.BASE_URL` từ config
- **Error Handling**: Comprehensive error handling với Vietnamese messages
- **Utility Methods**: Helper methods cho formatting và validation
- **Pattern**: Đồng bộ với pattern của `locationFolderService`

### 3. Store (`store/chatStore.ts`)
- **Zustand Store**: Global state management cho chat
- **State Management**: Conversations, messages, members, UI state
- **Actions**: CRUD operations cho tất cả entities
- **Optimistic Updates**: Real-time state updates

### 4. Hook (`hooks/useChat.ts`)
- **useChat Hook**: Easy-to-use hook cho React components
- **Integrated Toast**: Automatic success/error notifications
- **State Management**: Connected to Zustand store
- **Utility Functions**: Helper functions cho common operations

## API Endpoints Supported

### Conversations
- `GET /api/v1/chat/conversations` - Get all conversations
- `GET /api/v1/chat/conversations/{id}` - Get specific conversation
- `POST /api/v1/chat/conversations/group` - Create group conversation
- `PUT /api/v1/chat/conversations/{id}/name` - Update conversation name
- `PUT /api/v1/chat/conversations/{id}/avatar` - Update conversation avatar

### Messages
- `GET /api/v1/chat/conversations/{id}/messages` - Get messages with pagination
- `POST /api/v1/chat/messages` - Send message

### Members
- `GET /api/v1/chat/conversations/{id}/members` - Get group members
- `POST /api/v1/chat/conversations/{id}/members/{memberId}` - Add member
- `DELETE /api/v1/chat/conversations/{id}/members/{memberId}` - Remove member

## Usage Examples

### 1. Basic Setup
```typescript
import { useChat } from '../hooks/useChat';

function ChatComponent() {
  const {
    conversations,
    conversationsLoading,
    loadConversations,
    sendMessage
  } = useChat();

  useEffect(() => {
    loadConversations();
  }, []);

  return (
    // Your chat UI
  );
}
```

### 2. Send Message
```typescript
const handleSendMessage = async (conversationId: string, text: string) => {
  try {
    await sendMessage({
      conversationId,
      type: 'TEXT',
      content: { text }
    });
  } catch (error) {
    // Error is automatically handled by the hook
  }
};
```

### 3. Create Group
```typescript
const handleCreateGroup = async (name: string, avatarUrl?: string) => {
  try {
    const newGroup = await createGroupConversation({
      name,
      avatarUrl
    });
    // Navigate to the new group
  } catch (error) {
    // Error is automatically handled
  }
};
```

### 4. Load Messages
```typescript
const loadConversationMessages = async (conversationId: string) => {
  try {
    const messages = await loadMessages(conversationId, 0, 20);
    // Messages are automatically stored in the store
  } catch (error) {
    // Error is automatically handled
  }
};
```

### 5. Member Management
```typescript
const handleAddMember = async (conversationId: string, memberId: string) => {
  try {
    await addMemberToGroup(conversationId, memberId);
    // Success message is automatically shown
  } catch (error) {
    // Error is automatically handled
  }
};
```

## State Management

### Conversations State
```typescript
const {
  conversations,           // ChatConversation[]
  currentConversation,    // ChatConversation | null
  conversationsLoading,   // boolean
  conversationsError      // string | null
} = useChat();
```

### Messages State
```typescript
const {
  messages,               // { [conversationId]: ChatMessage[] }
  messagesLoading,        // { [conversationId]: boolean }
  messagesError          // { [conversationId]: string | null }
} = useChat();
```

### Members State
```typescript
const {
  members,               // { [conversationId]: ChatMember[] }
  membersLoading,        // { [conversationId]: boolean }
  membersError          // { [conversationId]: string | null }
} = useChat();
```

### UI State
```typescript
const {
  selectedConversationId, // string | null
  isTyping,              // { [conversationId]: boolean }
  unreadCount            // { [conversationId]: number }
} = useChat();
```

## Utility Functions

### Message Formatting
```typescript
// Format message content for display
const formattedContent = chatService.formatMessageContent(message);

// Format timestamp
const formattedTime = chatService.formatTimestamp(message.createdAt);
```

### Permission Checking
```typescript
// Check if user can perform action
const canAddMember = chatService.canPerformAction(userRole, 'add_member');
const canUpdateName = chatService.canPerformAction(userRole, 'update_name');
```

### Conversation Helpers
```typescript
// Get conversation display name
const displayName = chatService.getConversationDisplayName(conversation);

// Get conversation avatar
const avatar = chatService.getConversationAvatar(conversation);

// Format last message for conversation list
const lastMessage = chatService.formatLastMessage(conversation);
```

## Error Handling

All methods include comprehensive error handling:
- **Automatic Toast Notifications**: Success/error messages in Vietnamese
- **Error State Management**: Errors stored in Zustand store
- **Graceful Degradation**: App continues to work even if some operations fail
- **User-Friendly Messages**: All error messages are in Vietnamese

## Best Practices

### 1. Loading States
```typescript
// Always check loading states before showing UI
if (conversationsLoading) {
  return <LoadingSpinner />;
}
```

### 2. Error Handling
```typescript
// Errors are automatically handled, but you can also check error states
if (conversationsError) {
  return <ErrorMessage message={conversationsError} />;
}
```

### 3. Memory Management
```typescript
// Clear conversation data when leaving
useEffect(() => {
  return () => {
    reset(); // Clear all chat state
  };
}, []);
```

### 4. Real-time Updates
```typescript
// Use the store directly for real-time updates
const { addMessage, updateConversation } = useChatStore();

// Add message when received via API
const handleNewMessage = (message: ChatMessage) => {
  addMessage(message.conversationId, message);
};
```

## Integration with Existing Code

### 1. Import in Components
```typescript
import { useChat } from '../hooks/useChat';
import { chatService } from '../services/chatService';
```

### 2. Use in Navigation
```typescript
// Add chat tab to your navigation
import { ChatScreen } from './screens/ChatScreen';

// In your tab navigator
<Tab.Screen name="Chat" component={ChatScreen} />
```

### 3. Add to Services Index
```typescript
// Already added to services/index.ts
export { default as chatService } from './chatService';
```

## Next Steps

1. **Create Chat UI Components**: Build conversation list, message list, input components
2. **Implement Real-time**: Add real-time messaging capabilities
3. **Add File Upload**: Implement image/file sharing
4. **Add Push Notifications**: Notify users of new messages
5. **Add Message Search**: Search through conversation history
6. **Add Message Reactions**: Like, emoji reactions
7. **Add Message Threading**: Reply to specific messages

## Dependencies

- **Zustand**: State management
- **Axios**: HTTP client (via axiosInstance from config/axios)
- **React Hooks**: useCallback, useEffect, useState
- **Toast Context**: For notifications
- **Services Config**: Centralized endpoint configuration

## Configuration

Update the base URL in `config/services.ts` under `SOCIAL_SERVICE`:
```typescript
SOCIAL_SERVICE: {
    BASE_URL: process.env.EXPO_PUBLIC_SOCIAL_SERVICE_URL || 'https://hengout.tranquocdat.com/social-service/api/v1',
    ENDPOINTS: {
        // Chat endpoints are configured here
    }
}
```

All endpoints are configured in `config/services.ts` under `SOCIAL_SERVICE.ENDPOINTS`.
