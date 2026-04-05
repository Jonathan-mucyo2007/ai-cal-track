import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, TextInput, FlatList, ActivityIndicator, Platform } from 'react-native';
import { Colors } from '../styles/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { fatSecretService, FoodSearchError, FoodSearchResult } from '../services/fatSecretService';
import { useSafeBack } from '../hooks/useSafeBack';

export default function FoodSearch() {
  const goBack = useSafeBack('/');
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [query, setQuery] = useState('');
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
          const hits = await fatSecretService.searchFood(query);
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
    const calories = caloriesMatch ? caloriesMatch[1] : '?';
    
    return { serving, calories };
  };

  const renderFoodItem = ({ item }: { item: FoodSearchResult }) => {
    const { serving, calories } = extractMacros(item.food_description);
    
    return (
      <Animated.View layout={Layout.springify()} entering={FadeInUp.duration(400)}>
        <TouchableOpacity style={[styles.card, { backgroundColor: theme.surface }]} activeOpacity={0.7} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
          <View style={styles.cardContent}>
            <Text style={[styles.foodName, { color: theme.text }]} numberOfLines={1}>
              {item.food_name} {item.brand_name && <Text style={{color: theme.textSecondary, fontWeight: '500'}}>({item.brand_name})</Text>}
            </Text>
            
            <View style={styles.subInfoRow}>
               <Ionicons name="restaurant-outline" size={14} color={theme.textSecondary} />
               <Text style={[styles.subText, { color: theme.textSecondary }]}>{serving}</Text>
            </View>

            <View style={styles.macroRow}>
               <Ionicons name="flame" size={16} color="#FF4500" />
               <Text style={[styles.calorieText, { color: theme.text }]}>{calories} <Text style={styles.unitText}>kcal</Text></Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.addIconBtn, { backgroundColor: theme.primary + '15' }]} onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}>
            <Ionicons name="add" size={24} color={theme.primary} />
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
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: '#000000' }]}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB', // Subtle flat border matching image style
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
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
