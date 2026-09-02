import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDay } from '../state/DayContext';
import { useSettings } from '../state/SettingsContext';
import { createEntryTicket } from '../db/ticketsRepo';
import { buildEntryTicket } from '../printing/receipts';
import { sendToPrinter, PrinterError } from '../printing/printerService';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Entry'>;

export function EntryScreen({ navigation }: Props) {
  const { currentDay } = useDay();
  const { settings } = useSettings();
  const [plate, setPlate] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!currentDay || !settings) return;
    setSaving(true);
    try {
      const ticket = await createEntryTicket(currentDay.id, plate);
      if (settings.printerAddress) {
        try {
          await sendToPrinter(settings.printerAddress, buildEntryTicket(ticket, settings));
        } catch (err) {
          Alert.alert(
            'Ticket enregistré',
            `Ticket n° ${ticket.ticketNumber} créé, mais l'impression a échoué : ${
              err instanceof PrinterError ? err.message : 'erreur inconnue'
            }`
          );
          navigation.goBack();
          return;
        }
      } else {
        Alert.alert('Ticket enregistré', `Ticket n° ${ticket.ticketNumber} créé (aucune imprimante configurée).`);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Erreur', "Impossible d'enregistrer l'entrée du véhicule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Nouvelle entrée</Text>
      <Text style={styles.label}>Plaque d'immatriculation (optionnel)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: AB-123-CD"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="characters"
        value={plate}
        onChangeText={setPlate}
      />
      <Text style={styles.hint}>L'heure d'entrée est enregistrée automatiquement.</Text>
      <View style={styles.actions}>
        <PrimaryButton label="Enregistrer l'entrée" onPress={handleSubmit} loading={saving} />
        <PrimaryButton label="Annuler" variant="secondary" onPress={() => navigation.goBack()} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 20 },
  label: { color: colors.textMuted, fontSize: 14, marginBottom: 8 },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: { color: colors.textMuted, fontSize: 13, marginTop: 10, marginBottom: 30 },
  actions: { gap: 12, marginTop: 'auto' },
});
