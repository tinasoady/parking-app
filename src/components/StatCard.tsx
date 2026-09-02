import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  label: string;
  value: string;
  accent?: string;
}

export function StatCard({ label, value, accent = colors.primary }: Props) {
  return (
    <View style={[styles.card, { borderTopColor: accent }]}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderTopWidth: 4,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.cardText,
  },
  label: {
    marginTop: 4,
    fontSize: 13,
    color: colors.cardMuted,
    textAlign: 'center',
  },
});
