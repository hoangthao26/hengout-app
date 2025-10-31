# 📱 Subscription System Documentation

## Overview

The subscription system provides a complete solution for managing user subscriptions, payments, and feature limits in the app. It integrates with PayOS for payment processing and provides contextual upgrade prompts.

## 🏗️ Architecture

### Core Components

1. **Types** (`types/subscription.ts`)
   - Defines all TypeScript interfaces for subscription data
   - Includes PayOS integration types
   - Usage tracking and limits types

2. **Services**
   - `subscriptionService.ts` - Core subscription API calls
   - `paymentService.ts` - PayOS payment integration
   - `paymentFlowManager.ts` - Payment flow orchestration
   - `upgradePromptManager.ts` - Contextual upgrade prompts

3. **State Management** (`store/subscriptionStore.ts`)
   - Zustand store for subscription state
   - Payment state management
   - Usage tracking and limits

4. **UI Components** (`components/subscription/`)
   - `SubscriptionModal.tsx` - Plan selection modal
   - `SubscriptionStatusCard.tsx` - Status display card
   - `PaymentScreen.tsx` - Payment processing screen
   - `UpgradePrompt.tsx` - Contextual upgrade prompts

5. **Hooks** (`hooks/useSubscription.ts`)
   - React hook for easy subscription management
   - Auto-fetching and state management
   - Payment flow integration

## 🚀 Features

### 1. Subscription Management
- View available plans
- Check active subscription status
- Activate subscriptions after payment

### 2. Payment Integration
- PayOS integration for Vietnamese payments
- Web checkout and QR code support
- Payment status polling
- Automatic subscription activation

### 3. Usage Tracking
- Track user usage against limits
- Real-time limit checking
- Contextual upgrade prompts

### 4. Smart Prompts
- Show upgrade prompts when approaching limits
- Different urgency levels (info, warning, urgent)
- Feature-specific prompts
- Dismissible prompts

## 📋 Usage Examples

### Basic Subscription Check
```typescript
import { useSubscription } from '../hooks/useSubscription';

function MyComponent() {
  const { 
    activeSubscription, 
    hasActiveSubscription,
    plans,
    plansLoading 
  } = useSubscription();

  if (plansLoading) return <Loading />;
  
  return (
    <View>
      {hasActiveSubscription ? (
        <Text>Premium Active: {activeSubscription?.plan.name}</Text>
      ) : (
        <Button onPress={() => setShowPlans(true)}>
          Upgrade to Premium
        </Button>
      )}
    </View>
  );
}
```

### Payment Flow
```typescript
import { useSubscription } from '../hooks/useSubscription';

function PaymentComponent() {
  const { startPayment, completePayment } = useSubscription();

  const handlePurchase = async (planId: number) => {
    try {
      // Start payment
      const success = await startPayment(planId);
      if (success) {
        // Payment will be processed automatically
        // Complete payment when status is confirmed
        await completePayment(planId);
      }
    } catch (error) {
      console.error('Payment failed:', error);
    }
  };

  return (
    <Button onPress={() => handlePurchase(planId)}>
      Purchase Plan
    </Button>
  );
}
```

### Usage Tracking
```typescript
import { useSubscription } from '../hooks/useSubscription';

function UsageComponent() {
  const { 
    updateUsageAndCheck, 
    upgradePrompts,
    dismissUpgradePrompt 
  } = useSubscription();

  const handleCreateFolder = () => {
    // Update usage and check for prompts
    updateUsageAndCheck({ folders: currentFolders + 1 });
  };

  return (
    <View>
      <Button onPress={handleCreateFolder}>
        Create Folder
      </Button>
      
      {upgradePrompts.map(prompt => (
        <UpgradePrompt
          key={prompt.id}
          message={prompt.message}
          feature={prompt.feature}
          currentLimit={prompt.currentLimit}
          requiredLimit={prompt.requiredLimit}
          variant={prompt.variant}
          onUpgrade={() => setShowPlans(true)}
          onDismiss={() => dismissUpgradePrompt(prompt.id)}
        />
      ))}
    </View>
  );
}
```

## 🔧 Configuration

### Environment Variables
```env
EXPO_PUBLIC_SUBSCRIPTION_SERVICE_URL=https://api.hengout.app/subscription-service/api/v1
```

### API Endpoints
- `GET /subscriptions/plans` - Get available plans
- `GET /subscriptions/active` - Get active subscription
- `POST /subscriptions/activate` - Activate subscription
- `POST /payments/create` - Create payment
- `GET /payments/check` - Check payment status
- `POST /payments/confirm-webhook` - Confirm webhook
- `POST /payments/cancel` - Cancel payment

## 🎨 UI Integration

### Profile Screen Integration
The subscription system is integrated into the Profile screen with:
- Subscription status card
- Upgrade prompts
- Plan selection modal
- Payment processing screen

### Contextual Prompts
Upgrade prompts appear when users approach their limits:
- 80% usage: Info prompt
- 90% usage: Warning prompt
- 100% usage: Urgent prompt

## 🔄 Payment Flow

1. User selects a plan
2. Payment is created with PayOS
3. User is redirected to PayOS checkout
4. Payment status is polled
5. On success, subscription is activated
6. UI is updated to show premium status

## 📊 State Management

### Subscription State
```typescript
interface SubscriptionState {
  // Plans
  plans: Plan[];
  plansLoading: boolean;
  plansError: string | null;

  // Active Subscription
  activeSubscription: Subscription | null;
  subscriptionLoading: boolean;
  subscriptionError: string | null;

  // User Limits
  folderLimits: UserLimits | null;
  friendLimits: FriendLimit | null;
  groupLimits: GroupLimit | null;

  // Payment State
  currentPayment: PaymentData | null;
  paymentLoading: boolean;
  paymentError: string | null;
  paymentPolling: boolean;

  // Usage Tracking
  currentUsage: CurrentUsage;
  usageLimits: UsageLimits | null;
}
```

## 🧪 Testing

### Test Scenarios
1. **Plan Loading**: Verify plans load correctly
2. **Payment Flow**: Test complete payment process
3. **Subscription Activation**: Verify subscription activates after payment
4. **Usage Tracking**: Test limit checking and prompts
5. **Error Handling**: Test error scenarios

### Manual Testing Checklist
- [ ] Load subscription plans
- [ ] Select plan and create payment
- [ ] Complete payment on PayOS
- [ ] Verify subscription activation
- [ ] Test usage tracking
- [ ] Test upgrade prompts
- [ ] Test error handling

## 🚨 Error Handling

### Common Errors
1. **Network Errors**: Retry with exponential backoff
2. **Payment Failures**: Clear payment state and show error
3. **API Errors**: Show user-friendly error messages
4. **Timeout Errors**: Allow retry or cancellation

### Error Recovery
- Automatic retry for network errors
- Clear state on payment failure
- Graceful degradation for API errors
- User-friendly error messages

## 🔮 Future Enhancements

1. **Webhook Integration**: Real-time payment updates
2. **Analytics**: Track conversion rates and usage
3. **A/B Testing**: Test different prompt strategies
4. **Personalization**: AI-driven upgrade suggestions
5. **Offline Support**: Cache subscription data
6. **Multi-currency**: Support for different currencies

## 📝 Notes

- All payment processing goes through PayOS
- Subscription data is cached locally
- Usage tracking is real-time
- Prompts are contextual and non-intrusive
- Error handling is comprehensive
- UI is responsive and accessible

## 🤝 Contributing

When adding new features:
1. Update types in `types/subscription.ts`
2. Add service methods
3. Update store state
4. Create UI components
5. Update hooks
6. Add tests
7. Update documentation









