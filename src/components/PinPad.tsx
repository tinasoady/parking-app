import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  title: string;
  subtitle?: string;
  error?: string | null;
  pinLength?: number;
  onSubmit: (pin: string) => void;
  onCancel?: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export function PinPad({ title, subtitle, error, pinLength = 4, onSubmit, onCancel }: Props) {
  const [pin, setPin] = useState('');

  function press(key: string) {
    if (key === 'del') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (key === '') return;
    const next = pin + key;
    setPin(next);
    if (next.length === pinLength) {
      onSubmit(next);
      setPin('');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.dots}>
        {Array.from({ length: pinLength }).map((_, i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.grid}>
        {KEYS.map((key, i) => (
          <Pressable
            key={i}
            onPress={() => press(key)}
            disabled={key === ''}
            style={({ pressed }) => [styles.key, key === '' && styles.keyHidden, pressed && key !== '' && styles.keyPressed]}
          >
            <Text style={styles.keyLabel}>{key === 'del' ? '⌫' : key}</Text>
          </Pressable>
        ))}
      </View>
      {onCancel ? (
        <Pressable onPress={onCancel} style={styles.cancel}>
          <Text style={styles.cancelLabel}>Annuler</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 24 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: 16, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 12, marginVertical: 16 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.textMuted },
  dotFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
  error: { color: colors.danger, marginBottom: 8, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 3 * 76, justifyContent: 'center' },
  key: {
    width: 68,
    height: 68,
    margin: 4,
    borderRadius: 34,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyHidden: { backgroundColor: 'transparent' },
  keyPressed: { backgroundColor: colors.primary },
  keyLabel: { color: colors.text, fontSize: 22, fontWeight: '600' },
  cancel: { marginTop: 20 },
  cancelLabel: { color: colors.textMuted, fontSize: 15 },
});
