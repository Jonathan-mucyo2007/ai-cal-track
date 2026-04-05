import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../styles/colors';

interface DOBStepProps {
  value: string; // ISO string
  onChange: (val: string) => void;
}

export const DOBStep = ({ value, onChange }: DOBStepProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [date, setDate] = useState(value ? new Date(value) : new Date(2000, 0, 1));
  const [show, setShow] = useState(Platform.OS === 'ios');

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selectedDate) {
      setDate(selectedDate);
      onChange(selectedDate.toISOString());
    }
  };

  const calculateAge = (dob: Date) => {
    const diffMs = Date.now() - dob.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  const age = calculateAge(date);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>When is your birthday?</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>This helps calculate your metabolism.</Text>

      {Platform.OS === 'android' && (
        <TouchableOpacity 
          style={[styles.dateButton, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
          onPress={() => setShow(true)}
        >
          <Text style={[styles.dateText, { color: theme.text }]}>
            {date.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
      )}

      {show && (
        <View style={[styles.pickerContainer, { backgroundColor: theme.surface }]}>
          <DateTimePicker
            testID="dateTimePicker"
            value={date}
            mode="date"
            display="spinner"
            onChange={onDateChange}
            maximumDate={new Date()}
            textColor={theme.text}
          />
        </View>
      )}

      <View style={[styles.ageBox, { backgroundColor: theme.blobStart }]}>
        <Text style={[styles.ageText, { color: theme.text }]}>
          You are <Text style={{ color: theme.accent, fontWeight: '800' }}>{age}</Text> years old ✨
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
  },
  dateButton: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 40,
  },
  dateText: {
    fontSize: 24,
    fontWeight: '700',
  },
  pickerContainer: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 40,
  },
  ageBox: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
  },
  ageText: {
    fontSize: 18,
    fontWeight: '600',
  }
});
