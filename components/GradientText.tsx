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

// Global cache for native modules to prevent reloading
let cachedLinearGradient: any = null;
let cachedMaskedView: any = null;
let loadingPromise: Promise<void> | null = null;

// Pre-load modules once (exported for preloading from app startup)
export const loadNativeModules = async (): Promise<void> => {
    if (loadingPromise) {
        return loadingPromise;
    }

    loadingPromise = (async () => {
        try {
            if (Platform.OS === 'web') {
                return;
            }

            const [LinearGradientModule, MaskedViewModule] = await Promise.all([
                import('expo-linear-gradient'),
                import('@react-native-masked-view/masked-view')
            ]);

            cachedLinearGradient = LinearGradientModule.LinearGradient;
            cachedMaskedView = MaskedViewModule.default;
        } catch (error) {
            // Native modules not available
        }
    })();

    return loadingPromise;
};

// Auto-start loading when module is imported (only on native platforms)
if (Platform.OS !== 'web') {
    loadNativeModules();
}

const GradientText: React.FC<GradientTextProps> = ({
    children,
    colors,
    style,
    start = { x: 0, y: 0 },
    end = { x: 1, y: 0 },
    fallbackColor,
}) => {
    const [isReady, setIsReady] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Get fallback color
    const getFallbackColor = () => {
        if (fallbackColor) return fallbackColor;
        return colors[0] || '#FAA307';
    };

    // Load native modules on mount
    useEffect(() => {
        const init = async () => {
            try {
                await loadNativeModules();
                setIsReady(cachedLinearGradient !== null && cachedMaskedView !== null);
            } catch (error) {
                setHasError(true);
            }
        };

        init();
    }, []);

    // Fallback component for web, loading, or error states
    const FallbackText = () => (
        <Text style={[style, { color: getFallbackColor() }]}>
            {children}
        </Text>
    );

    // Use cached modules
    const LinearGradient = cachedLinearGradient;
    const MaskedView = cachedMaskedView;

    // Return fallback for web platform
    if (Platform.OS === 'web') {
        return <FallbackText />;
    }

    // Return fallback while loading or if there's an error
    if (!isReady || hasError || !LinearGradient || !MaskedView) {
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
