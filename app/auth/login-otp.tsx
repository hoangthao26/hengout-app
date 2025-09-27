import React from 'react';
import OtpForm from '../../modules/auth/components/OtpForm';

export default function LoginOtpScreen() {
    return <OtpForm onSubmit={otp => console.log('OTP entered:', otp)} />;
} 