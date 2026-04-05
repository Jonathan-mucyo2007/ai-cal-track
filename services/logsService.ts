import { doc, getDoc, setDoc, updateDoc, onSnapshot, increment } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface DailyLogSchema {
  dateString: string; // YYYY-MM-DD format
  totalCaloriesConsumed: number;
  totalWaterConsumedLiters?: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  totalCaloriesBurned?: number;
  logs: Array<{
    id: string;
    itemName: string;
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatsGrams: number;
    timestamp: number;
  }>;
  exerciseLogs?: Array<{
    id: string;
    itemName: string;
    caloriesBurned: number;
    timestamp: number;
    duration?: number;
    intensity?: string;
  }>;
}

export const logsService = {
  // Utility for formatting
  formatDateToYYYYMMDD(date: Date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Setup realtime listener for a specific day's log
  subscribeToDailyLog(userId: string, targetDate: Date, callback: (data: DailyLogSchema | null) => void) {
    const dateString = this.formatDateToYYYYMMDD(targetDate);
    const docRef = doc(db, 'users', userId, 'dailyLogs', dateString);

    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as DailyLogSchema);
      } else {
        // No logs for this target date yet
        callback({
          dateString,
          totalCaloriesConsumed: 0,
          totalWaterConsumedLiters: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFats: 0,
          logs: []
        });
      }
    }, (error) => {
      console.error("Error subscribing to daily log: ", error);
      callback(null);
    });
  },
  
  // Future method for when we build out the Add Log flow
  async addFoodLog(userId: string, targetDate: Date, logItem: Omit<DailyLogSchema['logs'][0], 'id' | 'timestamp'>) {
    const dateString = this.formatDateToYYYYMMDD(targetDate);
    const docRef = doc(db, 'users', userId, 'dailyLogs', dateString);
    
    const snap = await getDoc(docRef);
    const newLog = {
      ...logItem,
      id: Date.now().toString(),
      timestamp: Date.now()
    };

    if (!snap.exists()) {
      // Create new daily structure
      const newDailyLog: DailyLogSchema = {
        dateString,
        totalCaloriesConsumed: logItem.calories,
        totalProtein: logItem.proteinGrams,
        totalCarbs: logItem.carbsGrams,
        totalFats: logItem.fatsGrams,
        logs: [newLog]
      };
      await setDoc(docRef, newDailyLog);
    } else {
      // Append and atomically increment totals
      await updateDoc(docRef, {
        totalCaloriesConsumed: increment(logItem.calories),
        totalProtein: increment(logItem.proteinGrams),
        totalCarbs: increment(logItem.carbsGrams),
        totalFats: increment(logItem.fatsGrams),
        // we can use arrayUnion but for simple aggregation reading old array then writing is fast enough. 
        // to stay purely atomic with arrays: (import arrayUnion)
      });
      
      // Adding log array via explicit extraction avoiding import messes
      const existingData = snap.data() as DailyLogSchema;
      await updateDoc(docRef, {
        logs: [...(existingData.logs || []), newLog]
      });
    }
  },

  async addExerciseLog(userId: string, targetDate: Date, title: string, caloriesBurned: number, duration?: number, intensity?: string) {
    const dateString = this.formatDateToYYYYMMDD(targetDate);
    const docRef = doc(db, 'users', userId, 'dailyLogs', dateString);
    
    const snap = await getDoc(docRef);
    const newLog = {
      id: Date.now().toString(),
      itemName: title,
      caloriesBurned,
      timestamp: Date.now(),
      ...(duration && { duration }),
      ...(intensity && { intensity })
    };

    if (!snap.exists()) {
      const newDailyLog: DailyLogSchema = {
        dateString,
        totalCaloriesConsumed: 0,
        totalCaloriesBurned: caloriesBurned,
        totalProtein: 0,
        totalCarbs: 0,
        totalFats: 0,
        logs: [],
        exerciseLogs: [newLog]
      };
      await setDoc(docRef, newDailyLog);
    } else {
      await updateDoc(docRef, {
        totalCaloriesBurned: increment(caloriesBurned)
      });
      const existingData = snap.data() as DailyLogSchema;
      await updateDoc(docRef, {
        exerciseLogs: [...(existingData.exerciseLogs || []), newLog]
      });
    }
  },

  // Method to increment or decrement water consumption directly
  async addWaterLog(userId: string, targetDate: Date, liters: number) {
    const dateString = this.formatDateToYYYYMMDD(targetDate);
    const docRef = doc(db, 'users', userId, 'dailyLogs', dateString);
    
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      // Create schema with zeroed values except water, bounded to 0
      const newDailyLog: DailyLogSchema = {
        dateString,
        totalCaloriesConsumed: 0,
        totalWaterConsumedLiters: Math.max(0, liters),
        totalProtein: 0,
        totalCarbs: 0,
        totalFats: 0,
        logs: []
      };
      await setDoc(docRef, newDailyLog);
    } else {
      await updateDoc(docRef, {
        totalWaterConsumedLiters: increment(liters)
      });
    }
  }
};
