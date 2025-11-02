import React, { useEffect, useState } from 'react';
import { Platform, StyleProp, Text, TextStyle, View } from 'react-native';

interface GradientTextProps {
    children: React.ReactNode;
    colors: string[];
    style?: StyleProp<TextStyle>;
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    fallbackColor?: string;
}

const GradientText: React.FC<GradientTextProps> = ({
    children,
    colors,
    style,
    start = { x: 0, y: 0 },
    end = { x: 1, y: 0 },
    fallbackColor,
}) => {
    const [LinearGradient, setLinearGradient] = useState<any>(null);
    const [MaskedView, setMaskedView] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    // Get fallback color
    const getFallbackColor = () => {
        if (fallbackColor) return fallbackColor;
        return colors[0] || '#FAA307';
    };

    // Load native modules
    useEffect(() => {
        const loadNativeModules = async () => {
            try {
                // Skip loading on web platform
                if (Platform.OS === 'web') {
                    setIsLoading(false);
                    return;
                }

                const [LinearGradientModule, MaskedViewModule] = await Promise.all([
                    import('expo-linear-gradient'),
                    import('@react-native-masked-view/masked-view')
                ]);

                setLinearGradient(() => LinearGradientModule.LinearGradient);
                setMaskedView(() => MaskedViewModule.default);
            } catch (error) {
                // Native modules not available, fallback to regular text
                setHasError(true);
            } finally {
                setIsLoading(false);
            }
        };

        loadNativeModules();
    }, []);

    // Fallback component for web, loading, or error states
    const FallbackText = () => (
        <Text style={[style, { color: getFallbackColor() }]}>
            {children}
        </Text>
    );

    // Return fallback for web platform
    if (Platform.OS === 'web') {
        return <FallbackText />;
    }

    // Return fallback while loading or if there's an error
    if (isLoading || hasError || !LinearGradient || !MaskedView) {
        return <FallbackText />;
    }

    // Native gradient implementation
    try {
        return (
            <View style={{ flexDirection: 'row' }}>
                <MaskedView
                    style={{
                        flex: 1,
                        flexDirection: 'row',
                        height: 'auto',
                        minHeight: 20, // Ensure minimum height
                    }}
                    maskElement={
                        <Text style={[style, { backgroundColor: 'transparent' }]}>
                            {children}
                        </Text>
                    }
                >
                    <LinearGradient
                        colors={colors}
                        start={start}
                        end={end}
                        style={{
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <Text style={[style, { opacity: 0 }]}>
                            {children}
                        </Text>
                    </LinearGradient>
                </MaskedView>
            </View>
        );
    } catch (error) {
        // Error rendering gradient, fallback to regular text
        return <FallbackText />;
    }
};

export default GradientText;
