import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, TextInput, FlatList, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../styles/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { foodSearchService, FoodSearchError, FoodSearchResult } from '../services/fatSecretService';
import { useSafeBack } from '../hooks/useSafeBack';

export default function FoodSearch() {
  const router = useRouter();
  const params = useLocalSearchParams<{ query?: string }>();
  const goBack = useSafeBack('/');
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [query, setQuery] = useState(params.query || '');
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length >= 3) {
      setIsSearching(true);
      setSearchError(null);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      
      debounceTimer.current = setTimeout(async () => {
        try {
          const hits = await foodSearchService.searchFood(query);
          setResults(hits);
        } catch (error) {
          setResults([]);
          setSearchError(
            error instanceof FoodSearchError
              ? error.message
              : 'Something went wrong while searching for food.'
          );
        } finally {
          setIsSearching(false);
        }
      }, 500);
    } else {
      setResults([]);
      setIsSearching(false);
      setSearchError(null);
    }

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  const extractMacros = (description: string) => {
    const parts = description.split(' - ');
    const serving = parts[0] || '';
    const macroString = parts[1] || '';
    const caloriesMatch = macroString.match(/Calories:\s*(\d+)kcal/i);
    const fatMatch = macroString.match(/Fat:\s*([\d.]+)g/i);
    const carbsMatch = macroString.match(/Carbs:\s*([\d.]+)g/i);
    const proteinMatch = macroString.match(/Protein:\s*([\d.]+)g/i);
    const calories = caloriesMatch ? caloriesMatch[1] : '?';
    const fat = fatMatch ? fatMatch[1] : '0';
    const carbs = carbsMatch ? carbsMatch[1] : '0';
    const protein = proteinMatch ? proteinMatch[1] : '0';
    
    return { serving, calories, fat, carbs, protein };
  };

  const renderFoodItem = ({ item, index }: { item: FoodSearchResult; index: number }) => {
    const { serving, calories, fat, carbs, protein } = extractMacros(item.food_description);
    const accentPairs = [
      { solid: '#22C55E', soft: '#DCFCE7', icon: 'leaf-outline' as const },
      { solid: '#F97316', soft: '#FFEDD5', icon: 'flame-outline' as const },
      { solid: '#06B6D4', soft: '#CFFAFE', icon: 'water-outline' as const },
      { solid: '#A855F7', soft: '#F3E8FF', icon: 'sparkles-outline' as const },
    ];
    const accent = accentPairs[index % accentPairs.length];
    
    const handleSelect = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/log-food',
        params: {
          foodName: item.food_name,
          brandName: item.brand_name || '',
          foodDescription: item.food_description,
          foodType: item.food_type,
        },
      });
    };

    return (
      <Animated.View layout={Layout.springify()} entering={FadeInUp.duration(400)}>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: theme.surface, borderColor: accent.soft }]}
          activeOpacity={0.85}
          onPress={handleSelect}
        >
          <View style={[styles.cardGlow, { backgroundColor: accent.soft }]} />
          <View style={[styles.foodBadge, { backgroundColor: accent.soft }]}>
            <Ionicons name={accent.icon} size={22} color={accent.solid} />
          </View>

          <View style={styles.cardContent}>
            <Text style={[styles.foodName, { color: theme.text }]} numberOfLines={1}>
              {item.food_name} {item.brand_name && <Text style={{color: theme.textSecondary, fontWeight: '500'}}>({item.brand_name})</Text>}
            </Text>
            
            <View style={styles.subInfoRow}>
               <Ionicons name="restaurant-outline" size={14} color={theme.textSecondary} />
               <Text style={[styles.subText, { color: theme.textSecondary }]}>{serving}</Text>
            </View>

            <View style={styles.chipsRow}>
              <View style={[styles.macroChip, { backgroundColor: '#FEF2F2' }]}>
                <Text style={[styles.macroChipText, { color: '#DC2626' }]}>{protein}g protein</Text>
              </View>
              <View style={[styles.macroChip, { backgroundColor: '#EFF6FF' }]}>
                <Text style={[styles.macroChipText, { color: '#2563EB' }]}>{carbs}g carbs</Text>
              </View>
              <View style={[styles.macroChip, { backgroundColor: '#FFF7ED' }]}>
                <Text style={[styles.macroChipText, { color: '#EA580C' }]}>{fat}g fat</Text>
              </View>
            </View>

            <View style={styles.macroRow}>
               <Ionicons name="flame" size={16} color="#FF4500" />
               <Text style={[styles.calorieText, { color: theme.text }]}>{calories} <Text style={styles.unitText}>kcal</Text></Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.addIconBtn, { backgroundColor: accent.solid }]} onPress={handleSelect}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Header Configuration */}
      <View style={styles.headerRow}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.surface }]}
          onPress={goBack}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Animated.Text entering={FadeInDown.delay(100).springify()} style={[styles.mainTitle, { color: theme.text }]}>
          Add Food
        </Animated.Text>
      </View>

      {/* Search Bar */}
      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.searchSection}>
        <View style={[styles.searchShell, { backgroundColor: theme.surface }]}>
          <View style={styles.searchHeaderRow}>
            <View>
              <Text style={[styles.searchLabel, { color: theme.text }]}>Food Database</Text>
              <Text style={[styles.searchHint, { color: theme.textSecondary }]}>Search branded and generic foods in real time.</Text>
            </View>
            {results.length > 0 && (
              <View style={[styles.resultsBadge, { backgroundColor: theme.primary + '18' }]}>
                <Text style={[styles.resultsBadgeText, { color: theme.primary }]}>{results.length} found</Text>
              </View>
            )}
          </View>

          <View style={[styles.searchBar, { backgroundColor: theme.background, borderColor: theme.surfaceBorder }]}>
            <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search food (e.g. Apple, Pasta)"
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={setQuery}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
            />
            {isSearching && <ActivityIndicator size="small" color={theme.primary} style={styles.spinner} />}
          </View>
        </View>
      </Animated.View>

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.food_id.toString()}
        renderItem={renderFoodItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
           query.length >= 3 && !isSearching ? (
             <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color={theme.surface} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  {searchError || 'No results found.'}
                </Text>
             </View>
           ) : null
        }
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    marginBottom: 20,
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6', // light gray
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  searchSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  searchShell: {
    borderRadius: 28,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 5,
  },
  searchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  searchLabel: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  searchHint: {
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 220,
  },
  resultsBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resultsBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
    fontWeight: '500',
  },
  spinner: {
    marginLeft: 10,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 6,
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: -32,
    right: -12,
    width: 110,
    height: 110,
    borderRadius: 55,
    opacity: 0.6,
  },
  foodBadge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
    marginRight: 12,
  },
  foodName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  subInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  subText: {
    fontSize: 13,
    fontWeight: '500',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  macroChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  macroChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  calorieText: {
    fontSize: 15,
    fontWeight: '700',
  },
  unitText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF'
  },
  addIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  }
});
