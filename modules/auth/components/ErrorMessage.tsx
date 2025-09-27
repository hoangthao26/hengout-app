import React from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';

interface ErrorMessageProps {
    children: React.ReactNode;
    style?: StyleProp<TextStyle>;
}

const errorTextStyle: TextStyle = {
    color: '#EF4444',
    fontSize: 14,
    fontFamily: 'System',
    fontWeight: '400',
    marginTop: 8,
    marginBottom: 8,
};

const ErrorMessage: React.FC<ErrorMessageProps> = ({ children, style }) => (
    <Text style={[errorTextStyle, style]} accessibilityRole="alert">{children}</Text>
);

export default ErrorMessage; 