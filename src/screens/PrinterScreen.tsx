import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';
import { useSettings } from '../state/SettingsContext';
import { ensureBluetoothPermissions, isBluetoothEnabled, listPairedDevices, requestEnableBluetooth, sendToPrinter, PrinterError } from '../printing/printerService';
import { buildTestPrint } from '../printing/receipts';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Printer'>;

export function PrinterScreen({ navigation }: Props) {
  const { settings, update } = useSettings();
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const granted = await ensureBluetoothPermissions();
      if (!granted) {
        Alert.alert('Permission refusée', "L'accès au Bluetooth est nécessaire pour utiliser une imprimante.");
        return;
      }
      const enabled = await isBluetoothEnabled();
      if (!enabled) {
        await requestEnableBluetooth();
      }
      const paired = await listPairedDevices();
      setDevices(paired);
    } catch (err) {
      Alert.alert('Erreur', "Impossible de lister les appareils Bluetooth.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function selectDevice(device: BluetoothDevice) {
    if (!settings) return;
    await update({ ...settings, printerAddress: device.address, printerName: device.name });
    Alert.alert('Imprimante enregistrée', device.name);
  }

  async function handleTestPrint() {
    if (!settings?.printerAddress) {
      Alert.alert('Aucune imprimante sélectionnée');
      return;
    }
    setTesting(true);
    try {
      await sendToPrinter(settings.printerAddress, buildTestPrint(settings));
    } catch (err) {
      Alert.alert('Échec du test', err instanceof PrinterError ? err.message : 'Erreur inconnue');
    } finally {
      setTesting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Imprimante Bluetooth</Text>
      <Text style={styles.hint}>
        Appairez d'abord l'imprimante dans les réglages Bluetooth Android, puis sélectionnez-la ci-dessous.
        {Platform.OS === 'ios' ? "\n\nRemarque : l'impression thermique via Bluetooth Classic n'est fiable que sur Android." : ''}
      </Text>

      <PrimaryButton
        label="Ouvrir les réglages Bluetooth"
        variant="secondary"
        onPress={() => RNBluetoothClassic.openBluetoothSettings()}
      />

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Appareils appairés</Text>
        <PrimaryButton label={loading ? '...' : 'Actualiser'} variant="secondary" onPress={load} />
      </View>

      <FlatList
        data={devices}
        keyExtractor={(d) => d.address}
        ListEmptyComponent={<Text style={styles.empty}>Aucun appareil appairé trouvé.</Text>}
        renderItem={({ item }) => {
          const selected = settings?.printerAddress === item.address;
          return (
            <Pressable style={[styles.device, selected && styles.deviceSelected]} onPress={() => selectDevice(item)}>
              <Text style={styles.deviceName}>{item.name || 'Appareil sans nom'}</Text>
              <Text style={styles.deviceAddress}>{item.address}</Text>
              {selected ? <Text style={styles.selectedTag}>Sélectionnée</Text> : null}
            </Pressable>
          );
        }}
      />

      <View style={styles.footer}>
        <PrimaryButton label="Imprimer un ticket de test" onPress={handleTestPrint} loading={testing} variant="success" />
        <PrimaryButton label="Retour" variant="secondary" onPress={() => navigation.goBack()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 8 },
  hint: { color: colors.textMuted, fontSize: 13, marginBottom: 16 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  listTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 20 },
  device: { backgroundColor: colors.card, borderRadius: 10, padding: 14, marginBottom: 8 },
  deviceSelected: { borderWidth: 2, borderColor: colors.success },
  deviceName: { color: colors.cardText, fontWeight: '700', fontSize: 15 },
  deviceAddress: { color: colors.cardMuted, fontSize: 12, marginTop: 2 },
  selectedTag: { color: colors.success, fontSize: 12, fontWeight: '700', marginTop: 4 },
  footer: { gap: 10, marginTop: 10 },
});
