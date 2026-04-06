import React from 'react';
import { View, Text, StyleSheet, useColorScheme, ScrollView } from 'react-native';
import { Colors } from '../../styles/colors';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { DailyLogSchema } from '../../services/logsService';

type Props = {
  dailyLog: DailyLogSchema | null;
};

export const RecentActivity = ({ dailyLog }: Props) => {
  const logs = dailyLog?.logs || [];
  const exerciseLogs = dailyLog?.exerciseLogs || [];
  
  const combinedLogs = [
    ...logs.map(l => ({ ...l, type: 'food' as const })),
    ...exerciseLogs.map(e => ({ ...e, type: 'exercise' as const, calories: e.caloriesBurned }))
  ].sort((a, b) => b.timestamp - a.timestamp);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  return (
    <Animated.View entering={FadeInUp.delay(300).duration(600).springify()} style={[styles.cardContainer, { backgroundColor: theme.surface }]}>
      <Text style={[styles.headerTitle, { color: theme.text }]}>Recent Activity</Text>
      
      {combinedLogs.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <View style={[styles.iconCircle, { backgroundColor: theme.background }]}>
            <Ionicons name="restaurant-outline" size={32} color={theme.textSecondary} />
          </View>
          <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No activity yet</Text>
          <Text style={[styles.emptyStateSubtitle, { color: theme.textSecondary }]}>
            Log your first meal or workout to see it organized here.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.listContainer}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {combinedLogs.map((log, index) => {
             const isLast = index === combinedLogs.length - 1;
             if (log.type === 'exercise') {
               let mainIcon = 'barbell';
               const nameL = log.itemName.toLowerCase();
               if (nameL.includes('run') || nameL.includes('walk') || nameL.includes('treadmill') || nameL.includes('hiit')) mainIcon = 'walk';
               else if (nameL.includes('cycle') || nameL.includes('bike')) mainIcon = 'bicycle';
               else if (nameL.includes('swim')) mainIcon = 'water';

               return (
                 <View key={log.id} style={[styles.exerciseCard, { backgroundColor: theme.background }]}>
                   <View style={styles.exerciseCardRow}>
                     <View style={styles.exerciseLeft}>
                       <View style={[styles.bigIconCircle, { backgroundColor: '#FF450015' }]}>
                         <Ionicons name={mainIcon as any} size={28} color="#FF4500" />
                       </View>
                       <View style={styles.exerciseDetails}>
                         <Text style={[styles.exerciseName, { color: theme.text }]}>{log.itemName}</Text>
                         <View style={styles.exerciseStatsRow}>
                           <Ionicons name="flame" size={14} color="#FF4500" />
                           <Text style={[styles.burnText, { color: '#FF4500' }]}>{log.calories} kcal burned</Text>
                         </View>
                         {(log.intensity || log.duration) && (
                           <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                             {log.intensity ? `${log.intensity} Intensity` : ''} {log.duration ? `• ${log.duration} mins` : ''}
                           </Text>
                         )}
                       </View>
                     </View>
                     <View style={styles.exerciseRight}>
                       <Text style={[styles.logItemTime, { color: theme.textSecondary }]}>
                         {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </Text>
                     </View>
                   </View>
                 </View>
               );
             }
             
             return (
              <View key={log.id} style={[styles.foodCard, { backgroundColor: theme.background, marginBottom: isLast ? 0 : 8 }]}>
                <View style={styles.foodCardHeader}>
                  <View style={styles.foodCardLeft}>
                    <View style={[styles.foodIconCircle, { backgroundColor: theme.primary + '18' }]}>
                      <Ionicons name="restaurant" size={24} color={theme.primary} />
                    </View>
                    <View style={styles.foodDetails}>
                      <Text style={[styles.foodName, { color: theme.text }]} numberOfLines={1}>{log.itemName}</Text>
                      <Text style={[styles.foodServing, { color: theme.textSecondary }]} numberOfLines={1}>
                        {log.servingSize || '1 serving'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.timestampText, { color: theme.textSecondary }]}>
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                <View style={styles.foodStatsRow}>
                  <View style={[styles.foodStatPill, { backgroundColor: '#FFF7ED' }]}>
                    <Ionicons name="flame" size={14} color="#F97316" />
                    <Text style={[styles.foodStatText, { color: '#C2410C' }]}>{log.calories} kcal</Text>
                  </View>
                  <View style={[styles.foodStatPill, { backgroundColor: '#FEF2F2' }]}>
                    <Ionicons name="barbell" size={14} color="#DC2626" />
                    <Text style={[styles.foodStatText, { color: '#B91C1C' }]}>{log.proteinGrams}g protein</Text>
                  </View>
                  <View style={[styles.foodStatPill, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="flash" size={14} color="#2563EB" />
                    <Text style={[styles.foodStatText, { color: '#1D4ED8' }]}>{log.carbsGrams}g carbs</Text>
                  </View>
                </View>
              </View>
            )
          })}
        </ScrollView>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 20,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '80%',
  },
  listContainer: {
    gap: 16,
    paddingBottom: 4,
  },
  scrollArea: {
    maxHeight: 360,
  },
  foodCard: {
    borderRadius: 22,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 4,
  },
  foodCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 10,
  },
  foodCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  foodIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodDetails: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  foodServing: {
    fontSize: 13,
    fontWeight: '600',
  },
  timestampText: {
    fontSize: 12,
    fontWeight: '600',
  },
  foodStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  foodStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  foodStatText: {
    fontSize: 12,
    fontWeight: '800',
  },
  exerciseCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
    position: 'relative',
  },
  exerciseCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
    paddingRight: 40,
  },
  bigIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  exerciseStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  burnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailText: {
    fontSize: 13,
    fontWeight: '500',
  },
  exerciseRight: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  logItemTime: {
    fontSize: 12,
  }
});
