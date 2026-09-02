import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getDayById } from '../db/daysRepo';
import { listTicketsForDay } from '../db/ticketsRepo';
import { useSettings } from '../state/SettingsContext';
import { useDay } from '../state/DayContext';
import { useAdmin } from '../state/AdminContext';
import { buildDailyReport } from '../printing/receipts';
import { sendToPrinter, PrinterError } from '../printing/printerService';
import { PrimaryButton } from '../components/PrimaryButton';
import { PinPad } from '../components/PinPad';
import { colors } from '../theme';
import { formatCurrency, formatDateLabel, formatTime } from '../utils/format';
import type { RootStackParamList } from '../navigation/types';
import type { ParkingDay, Ticket } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'DayDetail'>;

export function DayDetailScreen({ route, navigation }: Props) {
  const { dayId } = route.params;
  const { settings } = useSettings();
  const { currentDay, resetDay } = useDay();
  const { isUnlocked, unlock } = useAdmin();
  const [day, setDay] = useState<ParkingDay | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [printing, setPrinting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showPinPad, setShowPinPad] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = await getDayById(dayId);
    setDay(d);
    const t = await listTicketsForDay(dayId);
    setTickets(t);
  }, [dayId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!day || !settings) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Chargement…</Text>
      </View>
    );
  }

  const paid = tickets.filter((t) => t.status === 'paid');
  const active = tickets.filter((t) => t.status === 'in_progress');
  const revenue = paid.reduce((sum, t) => sum + (t.finalAmount ?? 0), 0);
  const isOpenDay = currentDay?.id === day.id;

  async function handlePrintReport() {
    if (!settings!.printerAddress) {
      Alert.alert('Imprimante non configurée', "Configurez une imprimante Bluetooth dans Réglages avant d'imprimer.");
      return;
    }
    setPrinting(true);
    try {
      await sendToPrinter(settings!.printerAddress, buildDailyReport(day!, tickets, settings!));
    } catch (err) {
      Alert.alert('Erreur impression', err instanceof PrinterError ? err.message : "Échec de l'impression.");
    } finally {
      setPrinting(false);
    }
  }

  function handleResetPress() {
    if (active.length > 0) {
      Alert.alert('Véhicules encore présents', `${active.length} véhicule(s) sont encore stationnés. Encaissez-les avant de réinitialiser.`);
      return;
    }
    if (!isUnlocked) {
      setPinError(null);
      setShowPinPad(true);
      return;
    }
    confirmReset();
  }

  function confirmReset() {
    Alert.alert(
      'Clôturer la journée ?',
      "Cette action est irréversible : la journée sera archivée et le compteur de tickets repartira à zéro pour une nouvelle journée.",
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Clôturer', style: 'destructive', onPress: doReset },
      ]
    );
  }

  async function doReset() {
    setResetting(true);
    try {
      await resetDay();
      Alert.alert('Journée clôturée', 'Une nouvelle journée a été ouverte.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible de réinitialiser.');
    } finally {
      setResetting(false);
    }
  }

  async function handlePinSubmit(pin: string) {
    const ok = await unlock(pin);
    if (!ok) {
      setPinError('Code incorrect');
      return;
    }
    setShowPinPad(false);
    confirmReset();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={tickets}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>{formatDateLabel(day.dateLabel)}</Text>
            <Text style={styles.status}>{day.status === 'open' ? 'Journée en cours' : 'Journée clôturée'}</Text>

            <View style={styles.summary}>
              <SummaryItem label="Véhicules encaissés" value={String(paid.length)} />
              <SummaryItem label="Recette totale" value={formatCurrency(revenue, settings)} highlight />
              {active.length > 0 ? <SummaryItem label="Encore stationnés" value={String(active.length)} /> : null}
            </View>

            <View style={styles.actions}>
              <PrimaryButton label="Imprimer le rapport" onPress={handlePrintReport} loading={printing} />
              {isOpenDay ? (
                <PrimaryButton
                  label="Clôturer & réinitialiser (Admin)"
                  variant="danger"
                  onPress={handleResetPress}
                  loading={resetting}
                />
              ) : null}
            </View>

            <Text style={styles.listTitle}>Reçus</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.ticketRow}>
            <View>
              <Text style={styles.ticketNumber}>#{item.ticketNumber.toString().padStart(4, '0')} {item.plate ?? ''}</Text>
              <Text style={styles.ticketTime}>
                {formatTime(item.entryTime)} → {item.exitTime ? formatTime(item.exitTime) : 'en cours'}
              </Text>
            </View>
            <Text style={styles.ticketAmount}>{item.finalAmount != null ? formatCurrency(item.finalAmount, settings) : '-'}</Text>
          </View>
        )}
      />

      <Modal visible={showPinPad} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <PinPad
              title="Code administrateur requis"
              subtitle="Entrez le code PIN pour réinitialiser la journée"
              error={pinError}
              onSubmit={handlePinSubmit}
              onCancel={() => setShowPinPad(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SummaryItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryValue, highlight && styles.summaryValueHighlight]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  muted: { color: colors.textMuted },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', textTransform: 'capitalize' },
  status: { color: colors.textMuted, fontSize: 14, marginTop: 2, marginBottom: 16 },
  summary: { flexDirection: 'row', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  summaryItem: { backgroundColor: colors.card, borderRadius: 12, padding: 14, flexGrow: 1, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '700', color: colors.cardText },
  summaryValueHighlight: { color: colors.primary },
  summaryLabel: { fontSize: 12, color: colors.cardMuted, marginTop: 2, textAlign: 'center' },
  actions: { gap: 12, marginBottom: 24 },
  listTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 10 },
  ticketRow: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketNumber: { fontSize: 14, fontWeight: '700', color: colors.cardText },
  ticketTime: { fontSize: 12, color: colors.cardMuted, marginTop: 2 },
  ticketAmount: { fontSize: 15, fontWeight: '700', color: colors.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { backgroundColor: colors.background, borderRadius: 20 },
});
