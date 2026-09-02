import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSettings } from '../state/SettingsContext';
import { getTicketById, checkoutTicket } from '../db/ticketsRepo';
import { computeDurationMinutes, computePrice } from '../domain/pricing';
import { buildExitReceipt } from '../printing/receipts';
import { sendToPrinter, PrinterError } from '../printing/printerService';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../theme';
import { formatCurrency, formatDurationMinutes, formatTime } from '../utils/format';
import type { RootStackParamList } from '../navigation/types';
import type { BonusRule, Ticket } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Payment'>;

export function PaymentScreen({ route, navigation }: Props) {
  const { ticketId } = route.params;
  const { settings } = useSettings();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [selectedBonus, setSelectedBonus] = useState<BonusRule | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getTicketById(ticketId).then(setTicket);
  }, [ticketId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!ticket || !settings) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Chargement…</Text>
      </View>
    );
  }

  const duration = computeDurationMinutes(new Date(ticket.entryTime), now);
  const computation = computePrice(duration, settings.pricing, selectedBonus);

  async function handlePay() {
    setSaving(true);
    try {
      const exitTime = new Date();
      const finalDuration = computeDurationMinutes(new Date(ticket!.entryTime), exitTime);
      const finalComputation = computePrice(finalDuration, settings!.pricing, selectedBonus);
      const updated = await checkoutTicket(ticket!.id, {
        exitTime: exitTime.toISOString(),
        durationMinutes: finalComputation.durationMinutes,
        baseAmount: finalComputation.baseAmount,
        bonusLabel: finalComputation.bonusLabel,
        bonusDeduction: finalComputation.bonusDeduction,
        finalAmount: finalComputation.finalAmount,
      });
      if (settings!.printerAddress) {
        try {
          await sendToPrinter(settings!.printerAddress, buildExitReceipt(updated, settings!));
        } catch (err) {
          Alert.alert('Encaissé', `Paiement enregistré mais impression échouée : ${err instanceof PrinterError ? err.message : 'erreur'}`);
          navigation.goBack();
          return;
        }
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Erreur', "Impossible d'enregistrer le paiement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Ticket #{ticket.ticketNumber.toString().padStart(4, '0')}</Text>
      {ticket.plate ? <Text style={styles.plate}>{ticket.plate}</Text> : null}

      <View style={styles.card}>
        <Row label="Entrée" value={formatTime(ticket.entryTime)} />
        <Row label="Maintenant" value={formatTime(now.toISOString())} />
        <Row label="Durée" value={formatDurationMinutes(duration)} />
      </View>

      <Text style={styles.sectionTitle}>Bonus / réduction</Text>
      <View style={styles.bonusList}>
        <BonusOption label="Aucun bonus" selected={selectedBonus === null} onPress={() => setSelectedBonus(null)} />
        {settings.bonusRules.map((bonus) => (
          <BonusOption key={bonus.id} label={bonus.label} selected={selectedBonus?.id === bonus.id} onPress={() => setSelectedBonus(bonus)} />
        ))}
      </View>

      <View style={styles.card}>
        <Row label="Sous-total" value={formatCurrency(computation.baseAmount, settings)} />
        {computation.bonusDeduction > 0 ? (
          <Row label={computation.bonusLabel ?? 'Bonus'} value={`-${formatCurrency(computation.bonusDeduction, settings)}`} muted />
        ) : null}
        {computation.cappedAtDailyMax ? <Text style={styles.capNote}>Plafond journalier appliqué</Text> : null}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>{formatCurrency(computation.finalAmount, settings)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Encaisser & imprimer" onPress={handlePay} loading={saving} variant="success" />
        <PrimaryButton label="Annuler" variant="secondary" onPress={() => navigation.goBack()} />
      </View>
    </ScrollView>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, muted && styles.rowLabelMuted]}>{label}</Text>
      <Text style={[styles.rowValue, muted && styles.rowLabelMuted]}>{value}</Text>
    </View>
  );
}

function BonusOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <PrimaryButton label={label} onPress={onPress} variant={selected ? 'primary' : 'secondary'} />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  muted: { color: colors.textMuted },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  plate: { color: colors.textMuted, fontSize: 15, marginTop: 2, marginBottom: 16 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, marginTop: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { color: colors.cardMuted, fontSize: 15 },
  rowLabelMuted: { color: colors.warning },
  rowValue: { color: colors.cardText, fontSize: 15, fontWeight: '600' },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 24, marginBottom: 10 },
  bonusList: { gap: 8 },
  capNote: { color: colors.warning, fontSize: 13, marginTop: 4 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: { color: colors.cardText, fontSize: 18, fontWeight: '800' },
  totalValue: { color: colors.primary, fontSize: 22, fontWeight: '800' },
  actions: { gap: 12, marginTop: 28 },
});
