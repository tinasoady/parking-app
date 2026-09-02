import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSettings } from '../state/SettingsContext';
import { useAdmin } from '../state/AdminContext';
import { setAdminPin } from '../db/settingsRepo';
import { PrimaryButton } from '../components/PrimaryButton';
import { PinPad } from '../components/PinPad';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import type { AppSettings, BonusKind, BonusRule, RoundingMode } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Tabs'>;

function Field({ label, value, onChangeText, keyboardType }: { label: string; value: string; onChangeText: (v: string) => void; keyboardType?: 'numeric' | 'default' }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

function ChoiceRow<T extends string>({ options, value, onChange }: { options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.choiceRow}>
      {options.map((opt) => (
        <View key={opt.value} style={styles.choiceItem}>
          <PrimaryButton label={opt.label} variant={value === opt.value ? 'primary' : 'secondary'} onPress={() => onChange(opt.value)} />
        </View>
      ))}
    </View>
  );
}

export function SettingsScreen({ navigation }: Props) {
  const { settings, update } = useSettings();
  const { isUnlocked, unlock, lock } = useAdmin();
  const [pinError, setPinError] = useState<string | null>(null);

  const [draft, setDraft] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [editingBonus, setEditingBonus] = useState<BonusRule | null>(null);
  const [showPinChange, setShowPinChange] = useState(false);

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  if (!settings || !draft) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Chargement…</Text>
      </View>
    );
  }

  if (!isUnlocked) {
    return (
      <View style={styles.center}>
        <PinPad
          title="Accès administrateur"
          subtitle="Entrez le code PIN pour configurer l'application"
          error={pinError}
          onSubmit={async (pin) => {
            const ok = await unlock(pin);
            setPinError(ok ? null : 'Code incorrect');
          }}
        />
      </View>
    );
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    try {
      await update(draft);
      Alert.alert('Enregistré', 'Les réglages ont été mis à jour.');
    } finally {
      setSaving(false);
    }
  }

  function updatePricing<K extends keyof AppSettings['pricing']>(key: K, value: AppSettings['pricing'][K]) {
    setDraft((d) => (d ? { ...d, pricing: { ...d.pricing, [key]: value } } : d));
  }

  function removeBonus(id: string) {
    setDraft((d) => (d ? { ...d, bonusRules: d.bonusRules.filter((b) => b.id !== id) } : d));
  }

  function saveBonus(bonus: BonusRule) {
    setDraft((d) => {
      if (!d) return d;
      const exists = d.bonusRules.some((b) => b.id === bonus.id);
      const bonusRules = exists ? d.bonusRules.map((b) => (b.id === bonus.id ? bonus : b)) : [...d.bonusRules, bonus];
      return { ...d, bonusRules };
    });
    setShowBonusModal(false);
    setEditingBonus(null);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Réglages (Administrateur)</Text>

      <SectionTitle>Établissement</SectionTitle>
      <Field label="Nom" value={draft.businessName} onChangeText={(v) => setDraft({ ...draft, businessName: v })} />
      <Field label="Adresse" value={draft.businessAddress} onChangeText={(v) => setDraft({ ...draft, businessAddress: v })} />
      <Field label="Symbole monétaire" value={draft.currencySymbol} onChangeText={(v) => setDraft({ ...draft, currencySymbol: v })} />
      <Field
        label="Décimales monétaires"
        value={String(draft.currencyDecimals)}
        keyboardType="numeric"
        onChangeText={(v) => setDraft({ ...draft, currencyDecimals: Math.max(0, parseInt(v, 10) || 0) })}
      />
      <Field
        label="Largeur ticket (caractères, 32 = 58mm, 48 = 80mm)"
        value={String(draft.printerLineWidth)}
        keyboardType="numeric"
        onChangeText={(v) => setDraft({ ...draft, printerLineWidth: Math.max(24, parseInt(v, 10) || 32) })}
      />

      <SectionTitle>Tarification</SectionTitle>
      <Field
        label="Prix par heure"
        value={String(draft.pricing.hourlyRate)}
        keyboardType="numeric"
        onChangeText={(v) => updatePricing('hourlyRate', parseFloat(v) || 0)}
      />
      <Field
        label="Facturation par tranche de (minutes)"
        value={String(draft.pricing.billingIncrementMinutes)}
        keyboardType="numeric"
        onChangeText={(v) => updatePricing('billingIncrementMinutes', Math.max(1, parseInt(v, 10) || 60))}
      />
      <Text style={styles.fieldLabel}>Arrondi</Text>
      <ChoiceRow<RoundingMode>
        value={draft.pricing.roundingMode}
        onChange={(v) => updatePricing('roundingMode', v)}
        options={[
          { label: 'Supérieur', value: 'up' },
          { label: 'Proche', value: 'nearest' },
          { label: 'Inférieur', value: 'down' },
        ]}
      />
      <Field
        label="Minutes gratuites (grâce)"
        value={String(draft.pricing.graceMinutes)}
        keyboardType="numeric"
        onChangeText={(v) => updatePricing('graceMinutes', Math.max(0, parseInt(v, 10) || 0))}
      />
      <Field
        label="Plafond journalier (vide = aucun)"
        value={draft.pricing.dailyCapAmount != null ? String(draft.pricing.dailyCapAmount) : ''}
        keyboardType="numeric"
        onChangeText={(v) => updatePricing('dailyCapAmount', v.trim() === '' ? null : parseFloat(v) || 0)}
      />

      <SectionTitle>Bonus / réductions</SectionTitle>
      {draft.bonusRules.map((bonus) => (
        <View key={bonus.id} style={styles.bonusRow}>
          <Text style={styles.bonusLabel}>
            {bonus.label} ({bonus.kind === 'percent' ? `${bonus.value}%` : bonus.kind === 'flat' ? `-${bonus.value}` : `+${bonus.value} min`})
          </Text>
          <View style={styles.bonusActions}>
            <PrimaryButton label="Modifier" variant="secondary" onPress={() => { setEditingBonus(bonus); setShowBonusModal(true); }} />
            <PrimaryButton label="Suppr." variant="danger" onPress={() => removeBonus(bonus.id)} />
          </View>
        </View>
      ))}
      <PrimaryButton
        label="+ Ajouter un bonus"
        variant="secondary"
        onPress={() => {
          setEditingBonus({ id: `bonus-${Date.now()}`, label: '', kind: 'percent', value: 0 });
          setShowBonusModal(true);
        }}
      />

      <SectionTitle>Imprimante</SectionTitle>
      <Text style={styles.printerStatus}>
        {draft.printerName ? `Connectée : ${draft.printerName}` : 'Aucune imprimante configurée'}
      </Text>
      <PrimaryButton label="Configurer l'imprimante Bluetooth" onPress={() => navigation.navigate('Printer')} />

      <SectionTitle>Sécurité</SectionTitle>
      <PrimaryButton label="Changer le code PIN admin" variant="secondary" onPress={() => setShowPinChange(true)} />
      <PrimaryButton label="Verrouiller l'accès admin" variant="secondary" onPress={lock} />

      <View style={styles.saveRow}>
        <PrimaryButton label="Enregistrer les réglages" onPress={handleSave} loading={saving} variant="success" />
      </View>

      <Modal visible={showBonusModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {editingBonus ? (
              <BonusEditor bonus={editingBonus} onCancel={() => setShowBonusModal(false)} onSave={saveBonus} />
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={showPinChange} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <PinChangeForm
              onCancel={() => setShowPinChange(false)}
              onSaved={() => {
                setShowPinChange(false);
                Alert.alert('Code PIN mis à jour');
              }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function BonusEditor({ bonus, onSave, onCancel }: { bonus: BonusRule; onSave: (b: BonusRule) => void; onCancel: () => void }) {
  const [label, setLabel] = useState(bonus.label);
  const [kind, setKind] = useState<BonusKind>(bonus.kind);
  const [value, setValue] = useState(String(bonus.value));

  return (
    <View>
      <Text style={styles.modalTitle}>Bonus / réduction</Text>
      <Field label="Libellé" value={label} onChangeText={setLabel} />
      <Text style={styles.fieldLabel}>Type</Text>
      <ChoiceRow<BonusKind>
        value={kind}
        onChange={setKind}
        options={[
          { label: '% réduction', value: 'percent' },
          { label: 'Montant fixe', value: 'flat' },
          { label: 'Minutes offertes', value: 'freeMinutes' },
        ]}
      />
      <Field label="Valeur" value={value} keyboardType="numeric" onChangeText={setValue} />
      <View style={styles.modalActions}>
        <PrimaryButton
          label="Enregistrer"
          onPress={() => {
            if (!label.trim()) {
              Alert.alert('Libellé requis');
              return;
            }
            onSave({ ...bonus, label: label.trim(), kind, value: parseFloat(value) || 0 });
          }}
        />
        <PrimaryButton label="Annuler" variant="secondary" onPress={onCancel} />
      </View>
    </View>
  );
}

function PinChangeForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (pin.length < 4) {
      setError('Le code doit contenir au moins 4 chiffres');
      return;
    }
    if (pin !== confirm) {
      setError('Les codes ne correspondent pas');
      return;
    }
    await setAdminPin(pin);
    onSaved();
  }

  return (
    <View>
      <Text style={styles.modalTitle}>Nouveau code PIN</Text>
      <Field label="Nouveau code" value={pin} keyboardType="numeric" onChangeText={setPin} />
      <Field label="Confirmer" value={confirm} keyboardType="numeric" onChangeText={setConfirm} />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.modalActions}>
        <PrimaryButton label="Enregistrer" onPress={handleSave} />
        <PrimaryButton label="Annuler" variant="secondary" onPress={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  muted: { color: colors.textMuted },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 8 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 24, marginBottom: 10 },
  field: { marginBottom: 12 },
  fieldLabel: { color: colors.textMuted, fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  choiceItem: { flex: 1 },
  bonusRow: { backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 8 },
  bonusLabel: { color: colors.cardText, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  bonusActions: { flexDirection: 'row', gap: 8 },
  printerStatus: { color: colors.textMuted, marginBottom: 10 },
  saveRow: { marginTop: 30 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: colors.background, borderRadius: 16, padding: 20, width: '100%' },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  errorText: { color: colors.danger, marginBottom: 10 },
});
