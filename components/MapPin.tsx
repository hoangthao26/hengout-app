import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { LocationDetails } from '../types/location';

interface MapPinProps {
    location: LocationDetails;
    onPress?: (location: LocationDetails) => void;
    onCenterMap?: (latitude: number, longitude: number) => void;
    size?: 'small' | 'medium' | 'large';
    isSelected?: boolean;
    customIcon?: string;
}

const MapPin: React.FC<MapPinProps> = ({
    location,
    onPress,
    onCenterMap,
    size = 'medium',
    isSelected = false,
    customIcon = 'location'
}) => {
    const handlePress = () => {
        console.log('MapPin pressed:', location.name);

        // Center map on this location
        if (onCenterMap) {
            console.log('Centering map to:', location.latitude, location.longitude);
            onCenterMap(location.latitude, location.longitude);
        } else {
            console.log('onCenterMap not available');
        }

        // Call the original onPress callback
        if (onPress) {
            console.log('Calling onPress callback');
            onPress(location);
        } else {
            console.log('onPress not available');
        }
    };

    return (
        <Marker
            coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
            }}
            tracksViewChanges={false}
            flat={true}
            anchor={{ x: 0.5, y: 1 }}
            centerOffset={{ x: 0, y: 0 }}
            onPress={handlePress}
        />

    );
};

const styles = StyleSheet.create({
    customMarker: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerPin: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#F48C06',
        borderWidth: 3,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
});

export default MapPin;
