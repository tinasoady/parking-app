import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSettings } from '../state/SettingsContext';
import { useDay } from '../state/DayContext';
import { listTicketsForDay } from '../db/ticketsRepo';
import { StatCard } from '../components/StatCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../theme';
import { formatCurrency, formatDateLabel } from '../utils/format';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Tabs'>;

export function HomeScreen({ navigation }: Props) {
  const { settings } = useSettings();
  const { currentDay, loading } = useDay();
  const [stats, setStats] = useState({ active: 0, paid: 0, revenue: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!currentDay) return;
    const tickets = await listTicketsForDay(currentDay.id);
    const paidTickets = tickets.filter((t) => t.status === 'paid');
    setStats({
      active: tickets.filter((t) => t.status === 'in_progress').length,
      paid: paidTickets.length,
      revenue: paidTickets.reduce((sum, t) => sum + (t.finalAmount ?? 0), 0),
    });
  }, [currentDay]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading || !settings || !currentDay) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Chargement…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
    >
      <Text style={styles.businessName}>{settings.businessName}</Text>
      <Text style={styles.dateLabel}>{formatDateLabel(currentDay.dateLabel)}</Text>

      <View style={styles.statsRow}>
        <StatCard label="Stationnés" value={String(stats.active)} accent={colors.warning} />
        <StatCard label="Encaissés" value={String(stats.paid)} accent={colors.success} />
      </View>
      <View style={styles.revenueCard}>
        <Text style={styles.revenueLabel}>Recette du jour</Text>
        <Text style={styles.revenueValue}>{formatCurrency(stats.revenue, settings)}</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="+ Nouveau ticket (entrée)" onPress={() => navigation.navigate('Entry')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  muted: { color: colors.textMuted },
  businessName: { color: colors.text, fontSize: 22, fontWeight: '700' },
  dateLabel: { color: colors.textMuted, fontSize: 14, marginTop: 2, marginBottom: 20, textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  revenueCard: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  revenueLabel: { color: '#DBEAFE', fontSize: 14, marginBottom: 4 },
  revenueValue: { color: colors.text, fontSize: 32, fontWeight: '800' },
  actions: { gap: 12 },
});
