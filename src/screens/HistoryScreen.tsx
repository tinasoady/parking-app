import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { listDaysHistory } from '../db/daysRepo';
import { useSettings } from '../state/SettingsContext';
import { formatCurrency, formatDateLabel } from '../utils/format';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import type { ParkingDay } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Tabs'>;

export function HistoryScreen({ navigation }: Props) {
  const { settings } = useSettings();
  const [days, setDays] = useState<ParkingDay[]>([]);

  useFocusEffect(
    useCallback(() => {
      listDaysHistory().then(setDays);
    }, [])
  );

  if (!settings) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Historique des journées</Text>
      <FlatList
        data={days}
        keyExtractor={(d) => String(d.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => navigation.navigate('DayDetail', { dayId: item.id })}>
            <View>
              <Text style={styles.dateLabel}>{formatDateLabel(item.dateLabel)}</Text>
              <Text style={[styles.status, item.status === 'open' && styles.statusOpen]}>
                {item.status === 'open' ? 'En cours' : 'Clôturée'}
              </Text>
            </View>
            <Text style={styles.revenue}>{formatCurrency(item.totalRevenue, settings)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 16 },
  list: { gap: 10, paddingBottom: 20 },
  row: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateLabel: { fontSize: 15, fontWeight: '700', color: colors.cardText, textTransform: 'capitalize' },
  status: { fontSize: 13, color: colors.cardMuted, marginTop: 2 },
  statusOpen: { color: colors.success, fontWeight: '700' },
  revenue: { fontSize: 16, fontWeight: '700', color: colors.primary },
});
