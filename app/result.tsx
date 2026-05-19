import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import { DiscountType } from '@/lib/discount';
import { saveTransaction } from '@/lib/storage';
import { useReduceMotion } from '@/lib/useReduceMotion';

// ─── icon helper ─────────────────────────────────────────────────────────────

const SF_MAP: Record<string, string> = {
  'checkmark.circle.fill':       'checkmark-circle',
  'exclamationmark.circle.fill': 'alert-circle',
  'flag.fill':                   'flag',
  'square.and.arrow.down':       'download',
};

function Sym({
  name,
  size,
  tintColor,
  style,
}: {
  name: string;
  size: number;
  tintColor: string;
  style?: object;
}) {
  if (Platform.OS === 'ios') {
    return <SymbolView name={name as any} size={size} tintColor={tintColor} style={style} />;
  }
  return (
    <Ionicons
      name={(SF_MAP[name] || 'help-circle') as any}
      size={size}
      color={tintColor}
      style={style}
    />
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function peso(n: number) {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function ResultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const isDark    = useColorScheme() === 'dark';
  const bg        = isDark ? Colors.dark.background : Colors.background;
  const card      = isDark ? Colors.dark.card       : Colors.surface;
  const text      = isDark ? Colors.dark.text       : Colors.text;
  const secondary = isDark ? Colors.dark.secondary  : Colors.textSecondary;

  // ── Params from compute screen ────────────────────────────────────────────
  const {
    txName,
    discountType: dtParam,
    originalTotal: otStr,
    computedTotal: ctStr,
    discountAmount: daStr,
    vatDeducted: vdStr,
  } = useLocalSearchParams<{
    txName?: string;
    discountType?: string;
    originalTotal?: string;
    computedTotal?: string;
    discountAmount?: string;
    vatDeducted?: string;
  }>();

  const discountType   = (dtParam === 'senior' ? 'senior' : 'pwd') as DiscountType;
  const originalTotal  = parseFloat(otStr  ?? '0');
  const computedTotal  = parseFloat(ctStr  ?? '0');
  const discountAmount = parseFloat(daStr  ?? '0');
  const vatDeducted    = parseFloat(vdStr  ?? '0');

  const accentColor = discountType === 'pwd' ? Colors.pwd : Colors.senior;

  // ── Local state ───────────────────────────────────────────────────────────
  const [chargedRaw, setChargedRaw]             = useState('');
  const [compared, setCompared]                 = useState(false);
  const [saving, setSaving]                     = useState(false);
  const [saved, setSaved]                       = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);

  const charged   = parseFloat(chargedRaw) || 0;
  const diff      = Math.max(0, charged - computedTotal);
  const isCorrect = diff < 0.01;
  const canCompare = charged > 0;

  // ── Animations ────────────────────────────────────────────────────────────
  const reduceMotion = useReduceMotion();

  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const bannerSlide   = useRef(new Animated.Value(24)).current;
  const saveBtnOp     = useRef(new Animated.Value(0)).current;

  function handleChargedChange(t: string) {
    setChargedRaw(t);
    if (compared) {
      setCompared(false);
      bannerOpacity.setValue(0);
      bannerSlide.setValue(24);
      saveBtnOp.setValue(0);
    }
  }

  async function handleCompare() {
    if (!canCompare) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (reduceMotion) {
      bannerOpacity.setValue(1);
      bannerSlide.setValue(0);
      saveBtnOp.setValue(1);
      setCompared(true);
    } else {
      setCompared(true);
      Animated.parallel([
        Animated.timing(bannerOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(bannerSlide, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 140,
        }),
      ]).start();
      Animated.timing(saveBtnOp, { toValue: 1, duration: 220, delay: 180, useNativeDriver: true }).start();
    }
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  }

  async function handleSave() {
    if (saving || saved) return;
    setSaving(true);
    try {
      await saveTransaction({
        name: txName || 'Unnamed',
        discountType,
        items: [],
        originalTotal,
        vatDeducted,
        discountAmount,
        computedTotal,
        establishmentCharged: charged,
        discrepancy: diff,
        isCorrect,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
      setSaveModalVisible(true);
    } catch {
      Alert.alert('Save Failed', 'Could not save transaction. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const bannerBg    = isCorrect ? Colors.success : Colors.danger;
  const amountColor = compared
    ? (isCorrect ? Colors.success : Colors.danger)
    : Colors.success;

  return (
    <>
      <Stack.Screen
        options={{
          title: txName || 'Compare',
          headerStyle: { backgroundColor: bg },
          headerTintColor: accentColor,
          headerShadowVisible: false,
        }}
      />

      <View style={[styles.root, { backgroundColor: bg }]}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: compared ? insets.bottom + 100 : insets.bottom + 40 },
          ]}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentInsetAdjustmentBehavior="automatic"
        >

          {/* ── 1. What did they charge you? ─────────────────────── */}
          <SectionLabel text="WHAT DID THEY CHARGE YOU?" secondary={secondary} />
          <View style={[styles.card, { backgroundColor: card }]}>
            <View style={styles.priceRow}>
              <Text accessible={false} style={[styles.currencySign, { color: Colors.accent }]}>₱</Text>
              <TextInput
                style={[styles.priceInput, { color: text }]}
                placeholder="Enter total from your receipt"
                placeholderTextColor={Colors.placeholder}
                value={chargedRaw}
                onChangeText={handleChargedChange}
                keyboardType="decimal-pad"
                returnKeyType="done"
                selectTextOnFocus
                autoFocus
                maxFontSizeMultiplier={1.2}
                accessibilityLabel="Amount charged by establishment"
                accessibilityHint="Enter the peso total from your receipt"
              />
            </View>
          </View>

          {/* ── 2. Your computation breakdown ────────────────────── */}
          <SectionLabel text="YOUR COMPUTATION" secondary={secondary} />
          <View style={[styles.card, { backgroundColor: card }]}>
            <BRow label="Original Total" value={peso(originalTotal)} text={text} secondary={secondary} />
            <Hairline />
            <BRow label="VAT Deducted"   value={`− ${peso(vatDeducted)}`}    valueColor={Colors.danger} text={text} secondary={secondary} />
            <Hairline />
            <BRow label="Discount (20%)" value={`− ${peso(discountAmount)}`} valueColor={Colors.danger} text={text} secondary={secondary} />
            <View style={styles.totalDivider} />
            <BRow label="Amount to Pay"  value={peso(computedTotal)}          valueColor={amountColor} hero text={text} secondary={secondary} />
          </View>

          {/* ── 3. Animated result banner ─────────────────────────── */}
          {compared && (
            <Animated.View
              style={{ opacity: bannerOpacity, transform: [{ translateY: bannerSlide }] }}
            >
              <SectionLabel text="RESULT" secondary={secondary} />
              <View
                accessible={true}
                accessibilityLabel={
                  isCorrect
                    ? 'Result: Correct! The establishment charged you correctly.'
                    : `Result: Overcharged! You were overcharged by ${peso(diff)}.`
                }
                style={[styles.banner, { backgroundColor: bannerBg }]}
              >
                <StatusCircle isCorrect={isCorrect} />
                <Text accessible={false} style={styles.bannerTitle}>
                  {isCorrect ? 'Correct!' : 'Overcharged!'}
                </Text>
                <Text accessible={false} style={styles.bannerSub}>
                  {isCorrect
                    ? 'The establishment charged you correctly.'
                    : `You were overcharged by ${peso(diff)}.`}
                </Text>
                <View accessible={false} style={styles.typePill}>
                  <Text style={styles.typePillText} allowFontScaling={false}>
                    {discountType === 'pwd' ? 'PWD' : 'Senior Citizen'} · 20% Discount
                  </Text>
                </View>
              </View>

              {!isCorrect && (
                <Pressable
                  accessibilityLabel="Report this establishment"
                  accessibilityRole="button"
                  accessibilityHint="Opens a form to file a complaint or raise a concern about the overcharge"
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.reportBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: '/report',
                      params: {
                        transactionName: txName || '',
                        discountType,
                        originalTotal: String(originalTotal),
                        vatDeducted: String(vatDeducted),
                        discountAmount: String(discountAmount),
                        computedTotal: String(computedTotal),
                        establishmentCharged: String(charged),
                        discrepancy: String(diff),
                      },
                    })
                  }
                >
                  <View accessible={false} style={styles.btnRow}>
                    <Sym name="flag.fill" size={16} tintColor="#fff" />
                    <Text style={styles.actionBtnText}>Report This Establishment</Text>
                  </View>
                </Pressable>
              )}
            </Animated.View>
          )}

          {/* ── 4. Compare Now button ─────────────────────────────── */}
          {!compared && (
            <>
              <Pressable
                accessibilityLabel="Compare now"
                accessibilityRole="button"
                accessibilityHint={canCompare ? 'Compares the receipt amount against your computed discount' : 'Enter the amount from your receipt first'}
                accessibilityState={{ disabled: !canCompare }}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: Colors.accent },
                  pressed && { opacity: 0.85 },
                  !canCompare && styles.actionBtnDisabled,
                ]}
                onPress={handleCompare}
                disabled={!canCompare}
              >
                <Text accessible={false} style={styles.actionBtnText}>Compare Now</Text>
              </Pressable>
              {!canCompare && (
                <Text style={[styles.hint, { color: Colors.placeholder }]}>
                  Enter the total from your receipt to compare.
                </Text>
              )}
            </>
          )}

        </ScrollView>

        {/* ── 5. Floating Save button ──────────────────────────── */}
        {compared && (
          <Animated.View
            style={[
              styles.floatingBar,
              { bottom: insets.bottom + 16, opacity: saveBtnOp },
            ]}
          >
            <Pressable
              accessibilityLabel={saving ? 'Saving transaction' : saved ? 'Transaction saved' : 'Save transaction'}
              accessibilityRole="button"
              accessibilityHint={saved ? undefined : 'Saves this comparison to your history'}
              accessibilityState={{ disabled: saving || saved }}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: saved ? Colors.success : Colors.accent },
                pressed && !(saving || saved) && { opacity: 0.85 },
                (saving || saved) && { shadowOpacity: 0 },
              ]}
              onPress={handleSave}
              disabled={saving || saved}
            >
              <View accessible={false} style={styles.btnRow}>
                <Sym
                  name={saved ? 'checkmark.circle.fill' : 'square.and.arrow.down'}
                  size={16}
                  tintColor="#fff"
                />
                <Text style={styles.actionBtnText}>
                  {saving ? 'Saving…' : saved ? 'Saved' : 'Save Transaction'}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        )}
      </View>

      {/* ── Save success modal ──────────────────────────────────── */}
      <Modal visible={saveModalVisible} transparent animationType="slide" accessibilityViewIsModal={true}>
        <Pressable style={styles.modalOverlay} onPress={() => setSaveModalVisible(false)} />
        <View style={[styles.modalSheet, { backgroundColor: card, paddingBottom: insets.bottom + 24 }]}>
          <View accessible={false} style={styles.modalHandle} />
          <Sym
            name="checkmark.circle.fill"
            size={56}
            tintColor={Colors.success}
            style={styles.modalIcon}
            accessible={false}
          />
          <Text style={[styles.modalTitle, { color: text }]}>Transaction Saved!</Text>
          <Text style={[styles.modalSub, { color: secondary }]}>
            {`"${txName || 'Unnamed'}"\n`}
            {'has been saved to your history.'}
          </Text>
          <Pressable
            accessibilityLabel="View history"
            accessibilityRole="button"
            accessibilityHint="Opens your saved transaction history"
            style={({ pressed }) => [styles.modalBtnFill, pressed && { opacity: 0.85 }]}
            onPress={() => {
              setSaveModalVisible(false);
              router.push('/history');
            }}
          >
            <Text accessible={false} style={styles.modalBtnFillText}>View History</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Done"
            accessibilityRole="button"
            accessibilityHint="Closes this confirmation"
            style={({ pressed }) => [styles.modalBtnGhost, pressed && { opacity: 0.7 }]}
            onPress={() => setSaveModalVisible(false)}
          >
            <Text accessible={false} style={[styles.modalBtnGhostText, { color: Colors.accent }]}>Done</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ text, secondary }: { text: string; secondary: string }) {
  return <Text accessibilityRole="header" style={[styles.sectionLabel, { color: secondary }]} allowFontScaling={false}>{text}</Text>;
}

function Hairline() {
  return <View style={styles.hairline} />;
}

function StatusCircle({ isCorrect }: { isCorrect: boolean }) {
  return (
    <Sym
      name={isCorrect ? 'checkmark.circle.fill' : 'exclamationmark.circle.fill'}
      size={64}
      tintColor="rgba(255,255,255,0.90)"
      style={{ marginBottom: 12 }}
      accessible={false}
    />
  );
}

function BRow({
  label,
  value,
  valueColor,
  hero,
  text,
  secondary,
}: {
  label: string;
  value: string;
  valueColor?: string;
  hero?: boolean;
  text: string;
  secondary: string;
}) {
  return (
    <View
      accessible={true}
      accessibilityLabel={`${label}, ${value}`}
      style={[styles.bRow, hero && styles.bHeroRow]}
    >
      <Text accessible={false} style={[styles.bLabel, { color: secondary }, hero && styles.bHeroLabel, hero && { color: text }]}>
        {label}
      </Text>
      <Text
        accessible={false}
        style={[
          styles.bValue,
          { color: text },
          hero && styles.bHeroValue,
          valueColor ? { color: valueColor } : null,
        ]}
        maxFontSizeMultiplier={hero ? 1.2 : 1.3}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const HZ  = 16;
const CR  = 12;
const BTN = 14;

const styles = StyleSheet.create({
  root:    { flex: 1 },
  scroll:  { flex: 1 },
  content: { paddingTop: 8 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 8,
    marginHorizontal: HZ,
  },

  card: {
    borderRadius: CR,
    marginHorizontal: HZ,
    overflow: 'hidden',
  },

  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.separatorOpaque,
    marginHorizontal: 16,
  },
  totalDivider: { height: 1, backgroundColor: Colors.separatorOpaque },

  // Receipt input
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 2,
  },
  currencySign: {
    fontSize: 22,
    fontWeight: '300',
    paddingBottom: 2,
    marginRight: 2,
  },
  priceInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: -0.5,
    paddingVertical: 0,
  },

  // Breakdown rows
  bRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  bHeroRow: {
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  bLabel:     { fontSize: 15, fontWeight: '500' },
  bValue:     { fontSize: 15, fontWeight: '500', fontVariant: ['tabular-nums'] },
  bHeroLabel: { fontSize: 17, fontWeight: '600' },
  bHeroValue: { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },

  // Result banner
  banner: {
    marginHorizontal: HZ,
    borderRadius: 20,
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 6,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  bannerSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.86)',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
  },
  typePill: {
    marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  typePillText: { fontSize: 13, fontWeight: '600', color: '#fff', letterSpacing: 0.2 },

  // Buttons
  actionBtn: {
    marginHorizontal: HZ,
    marginTop: 28,
    minHeight: 52,
    borderRadius: BTN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnDisabled: { opacity: 0.38, shadowOpacity: 0 },
  actionBtnText: { fontSize: 17, fontWeight: '600', color: '#fff', letterSpacing: 0.1 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reportBtn: { backgroundColor: Colors.danger, marginTop: 16 },

  hint: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },

  // Floating save bar
  floatingBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: HZ,
  },

  // Save success modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.40)',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.separator,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 28,
  },
  modalIcon: { marginBottom: 16 },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  modalSub: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
    marginBottom: 28,
  },
  modalBtnFill: {
    width: '100%',
    minHeight: 52,
    borderRadius: BTN,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalBtnFillText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  modalBtnGhost: {
    width: '100%',
    minHeight: 52,
    borderRadius: BTN,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnGhostText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
