import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDay } from '../state/DayContext';
import { listActiveTickets } from '../db/ticketsRepo';
import { computeDurationMinutes } from '../domain/pricing';
import { formatDurationMinutes, formatTime } from '../utils/format';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import type { Ticket } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Tabs'>;

export function CheckoutScreen({ navigation }: Props) {
  const { currentDay } = useDay();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    if (!currentDay) return;
    const active = await listActiveTickets(currentDay.id);
    setTickets(active);
  }, [currentDay]);

  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(() => setNow(new Date()), 30000);
      return () => clearInterval(interval);
    }, [load])
  );

  useEffect(() => {
    setNow(new Date());
  }, [tickets]);

  const filtered = tickets.filter((t) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return String(t.ticketNumber).includes(q) || (t.plate ?? '').toLowerCase().includes(q);
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Véhicules stationnés</Text>
      <TextInput
        style={styles.search}
        placeholder="Rechercher par n° ou plaque"
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
      />
      <FlatList
        data={filtered}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Aucun véhicule stationné pour le moment.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => navigation.navigate('Payment', { ticketId: item.id })}>
            <View style={styles.rowLeft}>
              <Text style={styles.ticketNumber}>#{item.ticketNumber.toString().padStart(4, '0')}</Text>
              <Text style={styles.plate}>{item.plate || 'Sans plaque'}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.time}>Entrée {formatTime(item.entryTime)}</Text>
              <Text style={styles.duration}>{formatDurationMinutes(computeDurationMinutes(new Date(item.entryTime), now))}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 16 },
  search: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  list: { gap: 10, paddingBottom: 20 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  row: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeft: {},
  ticketNumber: { fontSize: 16, fontWeight: '700', color: colors.cardText },
  plate: { fontSize: 14, color: colors.cardMuted, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  time: { fontSize: 13, color: colors.cardMuted },
  duration: { fontSize: 15, fontWeight: '700', color: colors.primary, marginTop: 2 },
});
