import { Platform, PermissionsAndroid } from 'react-native';
import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';
import type { Buffer } from 'buffer';

export class PrinterError extends Error {}

/** Requests whatever Bluetooth runtime permissions the running Android version requires. */
export async function ensureBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  const sdkInt = Platform.Version as number;
  const permissions: string[] =
    sdkInt >= 31
      ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const results = await PermissionsAndroid.requestMultiple(permissions as any);
  return Object.values(results).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
}

export async function isBluetoothEnabled(): Promise<boolean> {
  return RNBluetoothClassic.isBluetoothEnabled();
}

export async function requestEnableBluetooth(): Promise<boolean> {
  return RNBluetoothClassic.requestBluetoothEnabled();
}

/** Devices already paired at the OS level (thermal printers must be paired once from Android's Bluetooth settings first). */
export async function listPairedDevices(): Promise<BluetoothDevice[]> {
  return RNBluetoothClassic.getBondedDevices();
}

async function connect(address: string): Promise<BluetoothDevice> {
  const alreadyConnected = await RNBluetoothClassic.isDeviceConnected(address).catch(() => false);
  if (alreadyConnected) {
    return RNBluetoothClassic.getConnectedDevice(address);
  }
  try {
    return await RNBluetoothClassic.connectToDevice(address);
  } catch (err) {
    throw new PrinterError(
      "Connexion à l'imprimante impossible. Vérifiez qu'elle est allumée, chargée et déjà appairée dans les réglages Bluetooth du téléphone."
    );
  }
}

/** Connects to the given printer, writes the raw ESC/POS payload, then disconnects. */
export async function sendToPrinter(address: string, payload: Buffer): Promise<void> {
  const granted = await ensureBluetoothPermissions();
  if (!granted) {
    throw new PrinterError("Permission Bluetooth refusée.");
  }
  const enabled = await isBluetoothEnabled();
  if (!enabled) {
    throw new PrinterError("Le Bluetooth est désactivé sur cet appareil.");
  }
  const device = await connect(address);
  try {
    await device.write(payload);
  } catch (err) {
    throw new PrinterError("Échec de l'impression. Réessayez, ou vérifiez l'imprimante.");
  } finally {
    await device.disconnect().catch(() => undefined);
  }
}
