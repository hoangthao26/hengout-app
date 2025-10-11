import React, { useRef } from 'react';
import { Text, StyleSheet, FlatList, View, TouchableOpacity } from 'react-native';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
    SharedValue,
    useAnimatedStyle,
    LinearTransition,
    SlideOutLeft,
} from 'react-native-reanimated';
import { Trash2 } from 'lucide-react-native';
import LocationCard from '../../components/LocationCard';
import { LocationDetails } from '../../types/location';

// Fake location data
const dummyData: LocationDetails[] = Array.from({ length: 20 }, (_, i) => ({
    id: String(i + 1),
    name: `Location ${i + 1}`,
    description: `Description for location ${i + 1}`,
    address: `${100 + i} Main Street, District ${(i % 5) + 1}, Ho Chi Minh City`,
    latitude: 10.7769 + (i * 0.001),
    longitude: 106.7009 + (i * 0.001),
    totalRating: Math.floor(Math.random() * 5) + 1,
    categories: [['Cafe', 'Restaurant', 'Bank', 'Gym', 'Hotel'][i % 5]],
    purposes: ['Business', 'Leisure'],
    tags: ['Popular', 'Nearby'],
    imageUrls: [`https://picsum.photos/200/200?random=${i}`],
    contacts: [
        {
            id: `contact-${i}`,
            value: `+84${900000000 + i}`,
            type: 'phone',
            description: 'Main phone',
            isMain: true,
            displayOrder: 1,
        }
    ],
}));

function RightAction(prog: SharedValue<number>, drag: SharedValue<number>, onDelete: () => void) {
    const styleAnimation = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: drag.value + 80 }],
        };
    });

    return (
        <Reanimated.View style={styleAnimation}>
            <TouchableOpacity style={styles.rightAction} onPress={onDelete}>
                <Trash2 size={24} color="#FFFFFF" />
            </TouchableOpacity>
        </Reanimated.View>
    );
}

export default function Example() {
    const itemRefs = useRef<{ [key: string]: any }>({});
    const [data, setData] = React.useState(dummyData);
    const [deletingIds, setDeletingIds] = React.useState<Set<string>>(new Set());

    const deleteItem = (id: string) => {
        // Đánh dấu item đang được xóa
        setDeletingIds(prev => new Set(prev).add(id));

        // Bỏ dòng này để slide ngay lập tức
        // itemRefs.current[id]?.close();


        // Delay để animation SlideOutLeft chạy xong
        setTimeout(() => {
            setData(data => data.filter(item => item.id !== id));
            setDeletingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        }, 350);
    };



    const renderItem = ({ item }: { item: LocationDetails }) => {
        return (
            <Reanimated.View
                style={styles.swipeableWrapper}
                exiting={SlideOutLeft.duration(300)}
                layout={LinearTransition.springify().stiffness(200)}>
                <ReanimatedSwipeable
                    key={item.id}
                    friction={2}
                    enableTrackpadTwoFingerGesture
                    rightThreshold={40}

                    renderRightActions={(prog, drag) =>
                        RightAction(prog, drag, () => deleteItem(item.id))
                    }
                    {...({ ref: (ref: any) => (itemRefs.current[item.id] = ref) } as any)}
                    onSwipeableOpenStartDrag={async () => {
                        const keys = Object.keys(itemRefs.current);
                        keys.map(async key => {
                            if (key !== item.id) {
                                await itemRefs.current[key]?.close();
                            }
                        });
                    }}
                >
                    <LocationCard
                        location={item}
                        variant="list"

                        addedAt={new Date().toISOString()}
                        onOpenDetail={(location) => {
                            console.log('Open detail for:', location.name);
                        }}
                    />
                </ReanimatedSwipeable>
            </Reanimated.View>
        );
    };

    return (
        <GestureHandlerRootView style={styles.container}>
            <FlatList
                data={data}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
            />
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    listContainer: {
        padding: 8,
    },
    rightAction: {
        width: 80,
        height: '100%',
        backgroundColor: '#ff4444',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,

    },
    swipeableWrapper: {
        marginVertical: 4,
    },
});