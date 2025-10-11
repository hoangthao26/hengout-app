import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, useColorScheme, View, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { locationService } from '../services/locationService';

interface FilterVibesModalProps {
    isVisible: boolean;
    onClose: () => void;
    onApply: (filters: { categories?: string[]; purposes?: string[]; tags?: string[] }) => void;
}

type Vibe = {
    id: string;
    description: string;
    categories: string[];
    purposes: string[];
    tags: string[];
    isNewest: boolean;
};

export const FilterVibesModal: React.FC<FilterVibesModalProps> = ({ isVisible, onClose, onApply }) => {
    const isDark = useColorScheme() === 'dark';
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['86%'], []);
    const { height: windowHeight } = useWindowDimensions();
    const contentHeight = useMemo(() => {
        // ~60% of screen height, clamped between 360 and 80% of screen
        const proposed = Math.floor(windowHeight * 0.6);
        const minH = 700;
        const maxH = Math.floor(windowHeight * 0.8);
        return Math.max(minH, Math.min(proposed, maxH));
    }, [windowHeight]);

    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [vibes, setVibes] = useState<Vibe[]>([]);
    const [selectedVibeIds, setSelectedVibeIds] = useState<Set<string>>(new Set());
    const [selected, setSelected] = useState<{ categories: Set<string>; purposes: Set<string>; tags: Set<string> }>({
        categories: new Set(),
        purposes: new Set(),
        tags: new Set(),
    });
    const [expanded, setExpanded] = useState<{ categories: boolean; purposes: boolean; tags: boolean }>({
        categories: true,
        purposes: false,
        tags: false,
    });
    // Snapshot of committed selection to allow canceling drafts on close
    const committedSnapshotRef = useRef<{ categories: Set<string>; purposes: Set<string>; tags: Set<string>; vibeIds: Set<string> } | null>(null);
    const appliedRef = useRef(false);

    useEffect(() => {
        if (isVisible) {
            setTimeout(() => bottomSheetRef.current?.expand(), 50);
            // Reset applied flag when opening
            appliedRef.current = false;
            // Always restore selection from last committed snapshot if available
            if (committedSnapshotRef.current) {
                const snap = committedSnapshotRef.current;
                setSelected({
                    categories: new Set(snap.categories),
                    purposes: new Set(snap.purposes),
                    tags: new Set(snap.tags),
                });
                setSelectedVibeIds(new Set(snap.vibeIds));
                // Refresh snapshot to a fresh clone (avoid shared refs)
                committedSnapshotRef.current = {
                    categories: new Set(snap.categories),
                    purposes: new Set(snap.purposes),
                    tags: new Set(snap.tags),
                    vibeIds: new Set(snap.vibeIds),
                };
            } else {
                // First open: take snapshot from current selection
                committedSnapshotRef.current = {
                    categories: new Set(selected.categories),
                    purposes: new Set(selected.purposes),
                    tags: new Set(selected.tags),
                    vibeIds: new Set(selectedVibeIds),
                };
            }
            // Load current vibes
            (async () => {
                setLoading(true);
                try {
                    const res = await locationService.getCurrentVibes();
                    console.log('📥 [FilterVibesModal] Initial getCurrentVibes response:', JSON.stringify(res, null, 2));
                    if (res.status === 'success') {
                        setVibes(res.data as any);
                    }
                } finally {
                    setLoading(false);
                }
            })();
        } else {
            bottomSheetRef.current?.close();
        }
    }, [isVisible]);

    const toggle = (type: 'categories' | 'purposes' | 'tags', value: string) => {
        setSelected(prev => {
            const next = new Set(prev[type]);
            if (next.has(value)) next.delete(value); else next.add(value);
            return { ...prev, [type]: next };
        });
    };

    const applyFilters = () => {
        appliedRef.current = true;
        // Derive categories/purposes/tags union from selected vibes
        const selectedVibes = vibes.filter(v => selectedVibeIds.has(v.id));
        const categories = Array.from(new Set(selectedVibes.flatMap(v => v.categories || [])));
        const purposes = Array.from(new Set(selectedVibes.flatMap(v => v.purposes || [])));
        const tags = Array.from(new Set(selectedVibes.flatMap(v => v.tags || [])));
        // Commit current draft to snapshot
        committedSnapshotRef.current = {
            categories: new Set(categories),
            purposes: new Set(purposes),
            tags: new Set(tags),
            vibeIds: new Set(selectedVibeIds),
        };
        onApply({ categories, purposes, tags });
        onClose();
    };

    const toggleVibe = (vibeId: string) => {
        setSelectedVibeIds(prev => {
            const next = new Set(prev);
            if (next.has(vibeId)) next.delete(vibeId); else next.add(vibeId);
            return next;
        });
    };

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={snapPoints}
            backdropComponent={(props) => (
                <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
            )}
            enablePanDownToClose
            enableContentPanningGesture={false}
            onChange={(i) => {
                if (i === -1 && isVisible) {
                    // If user closes without applying, revert draft to snapshot
                    if (!appliedRef.current && committedSnapshotRef.current) {
                        setSelected({
                            categories: new Set(committedSnapshotRef.current.categories),
                            purposes: new Set(committedSnapshotRef.current.purposes),
                            tags: new Set(committedSnapshotRef.current.tags),
                        });
                    }
                    appliedRef.current = false;
                    onClose();
                }
            }}
            backgroundStyle={{ backgroundColor: isDark ? '#000000' : '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
            handleIndicatorStyle={{ backgroundColor: '#FFFFFF', width: 40, height: 4 }}
            enableHandlePanningGesture
        >
            <BottomSheetView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                {/* Header (match LocationDetailModal style spacing) */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>Gợi ý theo Vibes</Text>
                    <TouchableOpacity disabled={generating} activeOpacity={1} onPress={async () => {
                        try {
                            setGenerating(true);
                            const res = await locationService.generateNewVibes();
                            console.log('📥 [FilterVibesModal] Generate new vibes response:', JSON.stringify(res, null, 2));
                            if (res?.status === 'success') {
                                const incoming = (res.data as any[] | undefined) ?? [];
                                // Replace all vibes with new ones
                                setVibes(incoming as Vibe[]);
                                console.log(`🔄 [FilterVibesModal] Replaced with ${incoming.length} new vibes.`);
                            } else {
                                console.log('⚠️ [FilterVibesModal] Unexpected status for generate new vibes:', res?.status);
                            }
                        } catch (e) {
                            console.log('❌ [FilterVibesModal] Generate new vibes failed:', e);
                        } finally {
                            setGenerating(false);
                        }
                    }}>
                        <LinearGradient
                            colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                            locations={[0, 0.31, 0.69, 1]}
                            start={{ x: 0, y: 1 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.headerAction, generating && { opacity: 0.7 }]}
                        >
                            <Text style={styles.headerActionText}>{generating ? 'Đang tạo…' : 'Vibes mới'}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
                {loading ? (
                    <View style={styles.loadingRow}><ActivityIndicator color="#F48C06" /><Text style={{ color: isDark ? '#FFFFFF' : '#000000', marginLeft: 8 }}>Đang tải...</Text></View>
                ) : vibes.length > 0 ? (
                    <ScrollView
                        style={[styles.content, { height: contentHeight }]}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
                    >
                        <View style={styles.vibesGrid}>
                            {vibes.map((item) => {
                                const active = selectedVibeIds.has(item.id);
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[
                                            styles.vibeItem,
                                            {
                                                width: '48%',
                                                borderWidth: 0,
                                                backgroundColor: active ? 'transparent' : (isDark ? '#111827' : '#F9FAFB'),
                                                shadowColor: active ? '#F48C06' : 'transparent',
                                                shadowOffset: { width: 0, height: active ? 4 : 0 },
                                                shadowOpacity: active ? 0.3 : 0,
                                                shadowRadius: active ? 8 : 0,
                                                elevation: active ? 8 : 0,
                                                overflow: 'hidden',
                                            }
                                        ]}
                                        activeOpacity={1}
                                        onPress={() => toggleVibe(item.id)}
                                    >
                                        {active ? (
                                            <LinearGradient
                                                colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                                                locations={[0, 0.31, 0.69, 1]}
                                                start={{ x: 0, y: 1 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.vibeGradient}
                                            >
                                                <Text
                                                    style={{
                                                        color: '#FFFFFF',
                                                        fontWeight: '700',
                                                        fontSize: 16,
                                                        paddingHorizontal: 14,
                                                        paddingVertical: 16,
                                                        textAlign: 'center'
                                                    }}
                                                    numberOfLines={3}
                                                >
                                                    {item.description}
                                                </Text>
                                            </LinearGradient>
                                        ) : (
                                            <Text
                                                style={{
                                                    color: isDark ? '#FFFFFF' : '#000000',
                                                    fontWeight: '700',
                                                    fontSize: 16,
                                                    paddingHorizontal: 14,
                                                    paddingVertical: 16,
                                                    textAlign: 'center'
                                                }}
                                                numberOfLines={3}
                                            >
                                                {item.description}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                ) : (
                    <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>Không có gợi ý vibes</Text>
                )}
                {/* Sticky Bottom Action Bar */}
                <View style={[styles.bottomActionBar, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
                    <View style={styles.actionRow}>
                        {(() => {
                            const totalSelected = selectedVibeIds.size;
                            const snap = committedSnapshotRef.current;
                            const hasChanges = (() => {
                                if (!snap) return totalSelected > 0;
                                const compareSets = (a: Set<string>, b: Set<string>) => {
                                    if (a.size !== b.size) return true;
                                    for (const v of a) if (!b.has(v)) return true;
                                    return false;
                                };
                                return (
                                    compareSets(selectedVibeIds, snap.vibeIds)
                                );
                            })();

                            if (!hasChanges) {
                                return (
                                    <TouchableOpacity style={[styles.applyButtonContainer]} disabled>
                                        <View style={[styles.applyButtonNeutral, { backgroundColor: isDark ? '#111827' : '#E5E7EB', borderColor: isDark ? '#374151' : '#D1D5DB' }]}>
                                            <Text style={[styles.applyText, styles.applyTextNeutral]}>{`Áp dụng`}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }
                            return (
                                <TouchableOpacity style={[styles.applyButtonContainer]} onPress={applyFilters}>
                                    <LinearGradient
                                        colors={["#FAA307", "#F48C06", "#DC2F02", "#9D0208"]}
                                        locations={[0, 0.31, 0.69, 1]}
                                        start={{ x: 0, y: 1 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.applyButton}
                                    >
                                        <Text style={[styles.applyText, { color: '#FFFFFF' }]}>{`Áp dụng${totalSelected > 0 ? ` (${totalSelected})` : ''}`}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            );
                        })()}
                    </View>
                </View>
            </BottomSheetView>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#000000' },
    header: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
    headerAction: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start' },
    headerActionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
    content: {},
    section: { marginBottom: 12 },
    sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    sectionRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#F48C06', alignItems: 'center', justifyContent: 'center', marginRight: 8, paddingHorizontal: 6 },
    badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
    selectAllPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginLeft: 8 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
    vibesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
    vibeItem: { borderRadius: 12, minHeight: 100, justifyContent: 'center', alignItems: 'center' },
    vibeGradient: { borderRadius: 12, minHeight: 100, justifyContent: 'center', alignItems: 'center', flex: 1 },
    vibeTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
    loadingRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
    selectedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    bottomActionBar: { paddingHorizontal: 0, paddingVertical: 16, position: 'absolute', left: 16, right: 16, bottom: 0 },
    applyButtonContainer: { borderRadius: 12, overflow: 'hidden' },
    applyButton: { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center' },
    applyButtonDisabled: { opacity: 0.6 },
    applyButtonNeutral: { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
    applyText: { fontWeight: '700', fontSize: 16 },
    applyTextNeutral: { color: '#6B7280' },
    actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
});

export default FilterVibesModal;


