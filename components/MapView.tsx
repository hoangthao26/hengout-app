import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, useColorScheme, Text, TouchableOpacity } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocation } from '../hooks/useLocation';
import { MapPin } from 'lucide-react-native';

interface MapController {
    centerMapOnLocation: (latitude: number, longitude: number, delta?: number) => void;
    goToInitialLocation: () => void;
}

interface MapViewProps {
    onLocationSelect?: (location: { lat: number; lng: number; address?: string }) => void;
    initialLocation?: { lat: number; lng: number };
    currentLocation?: { latitude: number; longitude: number; accuracy?: number; timestamp?: number } | null;
    showUserLocation?: boolean;
    style?: any;
    children?: React.ReactNode;
    onMapRef?: (mapController: MapController | null) => void;
}

const CustomMapView: React.FC<MapViewProps> = ({
    onLocationSelect,
    initialLocation = { lat: 10.8231, lng: 106.6297 }, // Ho Chi Minh City fallback
    currentLocation,
    showUserLocation = true,
    style,
    children,
    onMapRef
}) => {
    const isDark = useColorScheme() === 'dark';
    const mapRef = useRef<MapView>(null);
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

    const handleMapPress = (event: any) => {
        const { latitude, longitude } = event.nativeEvent.coordinate;
        const newLocation = { lat: latitude, lng: longitude };

        setSelectedLocation(newLocation);

        if (onLocationSelect) {
            onLocationSelect(newLocation);
        }

        // Enterprise: Remove debug logs in production
    };

    const handleUserLocationPress = () => {
        // Enterprise: Remove debug logs in production
        // Could trigger analytics or user action here
    };

    const handleGoToInitialLocation = () => {
        if (!mapRef.current) return;

        // Prefer current GPS location when available; fallback to provided initialLocation
        const targetLat = currentLocation?.latitude ?? initialLocation.lat;
        const targetLng = currentLocation?.longitude ?? initialLocation.lng;

        const region: Region = {
            latitude: targetLat,
            longitude: targetLng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };

        mapRef.current.animateToRegion(region, 600);
    };

    // Method to center map on specific coordinates
    const centerMapOnLocation = useCallback((latitude: number, longitude: number, delta: number = 0.01) => {
        if (!mapRef.current) return;

        const region: Region = {
            latitude,
            longitude,
            latitudeDelta: delta,
            longitudeDelta: delta,
        };

        mapRef.current.animateToRegion(region, 600);
    }, []);

    // Expose map controller to parent component
    useEffect(() => {
        if (onMapRef) {
            const mapController: MapController = {
                centerMapOnLocation,
                goToInitialLocation: handleGoToInitialLocation
            };
            onMapRef(mapController);
        }
    }, [onMapRef]); // Remove centerMapOnLocation and handleGoToInitialLocation from dependencies

    // Enterprise: Remove debug logs in production

    // Create initial region
    const initialRegion: Region = {
        latitude: initialLocation.lat,
        longitude: initialLocation.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    };

    // Note: Removed currentRegion to prevent auto-centering on location updates

    return (
        <View style={[styles.container, style]}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={initialRegion}
                onPress={handleMapPress}
                showsUserLocation={false}
                showsCompass={true}
                mapType="standard"
                mapPadding={{ bottom: -60, top: 60, left: 0, right: 0 }}
                showsPointsOfInterest={false}

            >
                {/* User Location Marker */}
                {currentLocation && showUserLocation && (
                    <Marker
                        coordinate={{
                            latitude: currentLocation.latitude,
                            longitude: currentLocation.longitude,
                        }}
                        title="Vị trí của bạn"
                        description="Đây là vị trí hiện tại của bạn"
                        onPress={handleUserLocationPress}
                    >
                        <View style={styles.userMarker}>
                            <LinearGradient
                                colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                                locations={[0, 0.31, 0.69, 1]}
                                start={{ x: 0, y: 1 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.userMarkerInner}
                            >
                            </LinearGradient>
                            <LinearGradient
                                colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                                locations={[0, 0.31, 0.69, 1]}
                                start={{ x: 0, y: 1 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.userMarkerPulse}
                            />
                        </View>
                    </Marker>
                )}

                {/* Render children (MapPins) */}
                {children}

            </MapView>

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
    userMarker: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    userMarkerInner: {
        width: 18,
        height: 18,
        borderRadius: 12,
        borderWidth: 3,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    userIcon: {
        fontSize: 14,
        color: '#FFFFFF',
    },
    userMarkerPulse: {
        position: 'absolute',
        width: 28,
        height: 28,
        borderRadius: 20,
        opacity: 0.3,
    },
});


export default CustomMapView;
