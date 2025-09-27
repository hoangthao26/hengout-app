import React, { useRef, useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';

interface Country {
    code: string;
    name: string;
    dialCode: string;
    flag: string;
}

interface CountryPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (country: Country) => void;
    selectedCountry: Country;
    countries: Country[];
    searchPlaceholder: string;
}

const CountryPicker: React.FC<CountryPickerProps> = ({ visible, onClose, onSelect, selectedCountry, countries, searchPlaceholder }) => {
    const [searchText, setSearchText] = useState('');
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['60%', '90%'], []);

    useEffect(() => {
        if (visible) {
            setTimeout(() => bottomSheetModalRef.current?.present(), 100);
        } else {
            bottomSheetModalRef.current?.dismiss();
        }
    }, [visible]);

    const filteredCountries = countries.filter(
        c =>
            c.name.toLowerCase().includes(searchText.toLowerCase()) ||
            c.dialCode.includes(searchText)
    );

    const renderCountryItem = ({ item }: { item: Country }) => (
        <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginLeft: 20 }}
            onPress={() => {
                onSelect(item);
                onClose();
            }}
        >
            <Text style={{ fontSize: 28, marginRight: 12 }}>{item.flag}</Text>
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 28, fontFamily: 'Dongle', color: '#111827', marginBottom: -16, marginTop: -14 }}>{item.name}</Text>
                <Text style={{ fontSize: 24, fontFamily: 'Dongle', color: '#6B7280', marginBottom: -16 }}>{item.dialCode}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <BottomSheetModal
            ref={bottomSheetModalRef}
            snapPoints={snapPoints}
            enablePanDownToClose
            backgroundStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: 'white' }}
            handleIndicatorStyle={{ backgroundColor: '#D1D5DB' }}
            onDismiss={onClose}
        >
            <BottomSheetView>
                <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
                    <TextInput
                        placeholder={searchPlaceholder}
                        placeholderTextColor="#9CA3AF"
                        value={searchText}
                        onChangeText={setSearchText}
                        style={{
                            backgroundColor: '#F3F4F6',
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            fontSize: 24,
                            fontFamily: 'Dongle',
                            color: '#111827',
                        }}
                    />
                </View>
                <FlatList
                    data={filteredCountries}
                    renderItem={renderCountryItem}
                    keyExtractor={(item) => item.code}
                    keyboardShouldPersistTaps="handled"
                />
            </BottomSheetView>
        </BottomSheetModal>
    );
};

export default CountryPicker; 