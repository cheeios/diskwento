import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
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
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/colors';
import { VAT_RATES, VatRate } from '@/constants/vatRates';
import { saveVatTransaction } from '@/lib/storage';
import { useReduceMotion } from '@/lib/useReduceMotion';

const ACCENT = Colors.accent;

// ─── helpers ─────────────────────────────────────────────────────────────────

function peso(n: number) {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function VatCalculatorScreen() {
  const insets = useSafeAreaInsets();

  const isDark    = useColorScheme() === 'dark';
  const bg        = isDark ? Colors.dark.background : Colors.background;
  const card      = isDark ? Colors.dark.card       : Colors.surface;
  const text      = isDark ? Colors.dark.text       : Colors.text;
  const secondary = isDark ? Colors.dark.secondary  : Colors.textSecondary;

  const reduceMotion = useReduceMotion();

  const [rawPrice, setRawPrice] = useState('');
  const [labelModal, setLabelModal] = useState(false);
  const [labelText, setLabelText] = useState('');
  const [showSections, setShowSections] = useState(false);
  const debounceRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionOpacity   = useRef(new Animated.Value(0)).current;
  const sectionTranslateY = useRef(new Animated.Value(10)).current;

  // Pick one random country on mount; stable for the session
  const [randomCountry] = useState<VatRate>(() => {
    const idx = Math.floor(Math.random() * VAT_RATES.length);
    return VAT_RATES[idx];
  });

  const price    = parseFloat(rawPrice) || 0;
  const hasPrice = price > 0;

  // ── 12% VAT decomposition ──────────────────────────────────────────────
  const exVat  = price / 1.12;
  const vatAmt = price - exVat;

  const defaultLabel = `₱${price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  async function doSave(label: string) {
    await saveVatTransaction({ label: label.trim() || defaultLabel, price, exVat, vatAmount: vatAmt });
    Alert.alert('Saved', 'VAT transaction saved to history.');
  }

  async function handleSave() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Save Transaction',
        'Add a label (e.g. Mercury Drug, SM Supermarket)',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save', onPress: (label?: string) => doSave(label ?? '') },
        ],
        'plain-text',
        '',
      );
    } else {
      setLabelText('');
      setLabelModal(true);
    }
  }

  function handlePriceChange(t: string) {
    setRawPrice(t);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const newPrice = parseFloat(t) || 0;
    if (newPrice <= 0) {
      setShowSections(false);
      sectionOpacity.setValue(0);
      sectionTranslateY.setValue(10);
      return;
    }
    setShowSections(false);
    sectionOpacity.setValue(0);
    sectionTranslateY.setValue(10);
    debounceRef.current = setTimeout(() => {
      if (reduceMotion) {
        sectionOpacity.setValue(1);
        sectionTranslateY.setValue(0);
        setShowSections(true);
      } else {
        setShowSections(true);
        Animated.parallel([
          Animated.timing(sectionOpacity, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(sectionTranslateY, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, 500);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'VAT Calculator',
          headerLargeTitle: true,
          headerStyle: { backgroundColor: bg },
          headerTintColor: ACCENT,
          headerShadowVisible: false,
          headerLargeTitleStyle: { color: text },
        }}
      />

      <View style={[styles.root, { backgroundColor: bg }]}>
        <ScrollView
          style={[styles.scroll, { backgroundColor: bg }]}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentInsetAdjustmentBehavior="automatic"
          automaticallyAdjustKeyboardInsets
        >

          {/* ── AMOUNT input ───────────────────────────────────── */}
          <SectionLabel text="AMOUNT" secondary={secondary} />
          <View style={[styles.card, styles.amountCard, { backgroundColor: card }]}>
            <View style={styles.priceRow}>
              <Text accessible={false} style={[styles.currencySign, { color: ACCENT }]}>₱</Text>
              <TextInput
                style={[styles.priceInput, { color: text }]}
                placeholder="0.00"
                placeholderTextColor={Colors.placeholder}
                value={rawPrice}
                onChangeText={handlePriceChange}
                keyboardType="decimal-pad"
                returnKeyType="done"
                selectTextOnFocus
                maxFontSizeMultiplier={1.4}
                accessibilityLabel="Price amount"
                accessibilityHint="Enter the VAT-inclusive price"
              />
            </View>
            <Hairline />
            <View style={styles.captionRow}>
              <Text style={[styles.captionText, { color: secondary }]} allowFontScaling={false}>
                VAT-inclusive · 12% VAT already included in this price
              </Text>
            </View>
          </View>

          {/* ── BREAKDOWN, DID YOU KNOW, VAT AROUND THE WORLD ────── */}
          {showSections && (
            <Animated.View
              style={{
                opacity: sectionOpacity,
                transform: [{ translateY: sectionTranslateY }],
              }}
            >
              <SectionLabel text="BREAKDOWN" secondary={secondary} />
              <View style={[styles.card, { backgroundColor: card }]}>
                <CalcRow
                  label="VAT-exclusive price"
                  value={peso(exVat)}
                  note="Base price before tax"
                  text={text}
                  secondary={secondary}
                />
                <Hairline />
                <CalcRow
                  label="VAT amount (12%)"
                  value={`+ ${peso(vatAmt)}`}
                  valueColor={Colors.danger}
                  note="Tax you're paying"
                  text={text}
                  secondary={secondary}
                />
                <View style={styles.totalDivider} />
                <CalcRow
                  label="VAT-inclusive price"
                  value={peso(price)}
                  valueColor={ACCENT}
                  hero
                  text={text}
                  secondary={secondary}
                />
              </View>

              <Pressable
                accessibilityLabel="Save transaction"
                accessibilityRole="button"
                accessibilityHint="Saves this VAT computation to your history"
                style={({ pressed }) => [styles.saveBtn, styles.saveBtnTop, pressed && { opacity: 0.85 }]}
                onPress={handleSave}
              >
                <Text accessible={false} style={styles.saveBtnText}>Save Transaction</Text>
              </Pressable>

              <SectionLabel
                text={randomCountry.isHistorical ? 'DID YOU KNOW?' : 'VAT AROUND THE WORLD'}
                secondary={secondary}
              />
              <WorldCard
                country={randomCountry}
                price={price}
                exVat={exVat}
                hasPrice={hasPrice}
                card={card}
                text={text}
                secondary={secondary}
              />

              <Text accessible={false} style={styles.footnote} allowFontScaling={false}>
                VAT rates sourced from globalvatcompliance.com. Figures are for reference only and assume the same base price.
              </Text>
            </Animated.View>
          )}

        </ScrollView>
      </View>

      {/* ── Android label modal ────────────────────────────────────────── */}
      <Modal
        visible={labelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setLabelModal(false)}
        accessibilityViewIsModal
      >
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: card }]}>
            <Text style={[styles.modalTitle, { color: text }]}>Save Transaction</Text>
            <Text style={[styles.modalSubtitle, { color: secondary }]}>
              Add a label (e.g. Mercury Drug, SM Supermarket)
            </Text>
            <TextInput
              style={[styles.modalInput, { color: text, borderColor: secondary }]}
              placeholder={defaultLabel}
              placeholderTextColor={Colors.placeholder}
              value={labelText}
              onChangeText={setLabelText}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => { setLabelModal(false); doSave(labelText); }}
              accessibilityLabel="Transaction label"
            />
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                onPress={() => setLabelModal(false)}
                style={[styles.modalBtn, styles.modalBtnCancel]}
              >
                <Text style={[styles.modalBtnText, { color: secondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save transaction"
                onPress={() => { setLabelModal(false); doSave(labelText); }}
                style={[styles.modalBtn, styles.modalBtnSave]}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
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

function CalcRow({
  label,
  value,
  note,
  valueColor,
  hero,
  text,
  secondary,
}: {
  label: string;
  value: string;
  note?: string;
  valueColor?: string;
  hero?: boolean;
  text: string;
  secondary: string;
}) {
  return (
    <View
      accessible={true}
      accessibilityLabel={note ? `${label}, ${note}, ${value}` : `${label}, ${value}`}
      style={[styles.calcRow, hero && styles.calcHeroRow]}
    >
      <View accessible={false} style={styles.calcLabelGroup}>
        <Text style={[styles.calcLabel, { color: secondary }, hero && styles.calcHeroLabel, hero && { color: text }]}>
          {label}
        </Text>
        {note ? <Text style={[styles.calcNote, { color: Colors.placeholder }]} allowFontScaling={false}>{note}</Text> : null}
      </View>
      <Text
        accessible={false}
        style={[
          styles.calcValue,
          { color: text },
          hero && styles.calcHeroValue,
          valueColor ? { color: valueColor } : null,
        ]}
        maxFontSizeMultiplier={hero ? 1.4 : 1.5}
      >
        {value}
      </Text>
    </View>
  );
}

function WorldCard({
  country,
  price,
  exVat,
  hasPrice,
  card,
  text,
  secondary,
}: {
  country: VatRate;
  price: number;
  exVat: number;
  hasPrice: boolean;
  card: string;
  text: string;
  secondary: string;
}) {
  const countryPrice = country.rate === 0 ? exVat : exVat * (1 + country.rate);
  const difference   = Math.abs(price - countryPrice);
  const isFree       = country.rate === 0;
  const isCheaper    = countryPrice < price;
  const diffColor    = isCheaper || isFree ? Colors.success : Colors.danger;
  const rateText     = country.rate === 0 ? 'No VAT' : `${(country.rate * 100).toFixed(0)}%`;

  return (
    <View style={[styles.card, { backgroundColor: card }]}>

      {/* Header: flag · country · label · rate */}
      <View
        accessible={true}
        accessibilityLabel={`${country.country}, ${rateText}${country.label && country.rate > 0 ? ', ' + country.label : ''}`}
        style={styles.worldHeader}
      >
        <Text accessible={false} style={styles.worldFlag}>{country.flag}</Text>
        <View accessible={false} style={styles.worldHeaderInfo}>
          <Text style={[styles.worldHeaderCountry, { color: text }]}>{country.country}</Text>
          {country.rate > 0 && (
            <Text style={[styles.worldHeaderLabel, { color: secondary }]}>{country.label}</Text>
          )}
        </View>
        <Text accessible={false} style={[styles.worldHeaderRate, { color: secondary }]}>{rateText}</Text>
      </View>

      <View style={styles.totalDivider} />

      {hasPrice ? (
        <>
          <View style={styles.worldBody}>
            {country.isHistorical ? (
              <Text style={[styles.worldBodyText, { color: secondary }]}>
                {'On '}
                <Text style={[styles.worldBodyBold, { color: text }]}>{'February 1, 2006'}</Text>
                {', '}
                <Text style={[styles.worldBodyBold, { color: text }]}>{'RA 9337'}</Text>
                {' (the Reformed VAT Law) raised the Philippine VAT rate from '}
                <Text style={[styles.worldBodyBold, { color: diffColor }]}>{'10%'}</Text>
                {' to '}
                <Text style={[styles.worldBodyBold, { color: Colors.danger }]}>{'12%'}</Text>
                {". Here's what your bill would have looked like back then:"}
              </Text>
            ) : isFree ? (
              <Text style={[styles.worldBodyText, { color: secondary }]}>
                {'Did you know? '}
                <Text style={[styles.worldBodyBold, { color: text }]}>{country.country}</Text>
                {' has no VAT at all! If you bought this item there, you would only pay '}
                <Text style={[styles.worldBodyBold, { color: diffColor }]}>{peso(countryPrice)}</Text>
                {' — the base price with zero tax, saving you '}
                <Text style={[styles.worldBodyBold, { color: diffColor }]}>{peso(difference)}</Text>
                {' compared to what you paid here.'}
              </Text>
            ) : isCheaper ? (
              <Text style={[styles.worldBodyText, { color: secondary }]}>
                {'Did you know? If you bought this item in '}
                <Text style={[styles.worldBodyBold, { color: text }]}>{country.country}</Text>
                {', you would only pay '}
                <Text style={[styles.worldBodyBold, { color: diffColor }]}>{peso(countryPrice)}</Text>
                {" — that's "}
                <Text style={[styles.worldBodyBold, { color: diffColor }]}>{peso(difference)}</Text>
                {' less than the '}
                <Text style={[styles.worldBodyBold, { color: text }]}>{peso(price)}</Text>
                {' you paid here.'}
              </Text>
            ) : (
              <Text style={[styles.worldBodyText, { color: secondary }]}>
                {'Did you know? If you bought this item in '}
                <Text style={[styles.worldBodyBold, { color: text }]}>{country.country}</Text>
                {', you would pay a whopping '}
                <Text style={[styles.worldBodyBold, { color: diffColor }]}>{peso(countryPrice)}</Text>
                {" — that's "}
                <Text style={[styles.worldBodyBold, { color: diffColor }]}>{peso(difference)}</Text>
                {' more than the '}
                <Text style={[styles.worldBodyBold, { color: text }]}>{peso(price)}</Text>
                {' you paid here.'}
              </Text>
            )}
          </View>

          <View style={styles.totalDivider} />
          <View
            accessible={true}
            accessibilityLabel={
              country.isHistorical
                ? `You would've saved, − ${peso(difference)}`
                : `${isFree || isCheaper ? 'You save' : 'You pay more'}, ${isFree || isCheaper ? '− ' : '+ '}${peso(difference)}`
            }
            style={styles.worldDiffRow}
          >
            <Text accessible={false} style={[styles.worldDiffLabel, { color: text }]}>
              {country.isHistorical ? "You would've saved" : (isFree || isCheaper ? 'You save' : 'You pay more')}
            </Text>
            <Text accessible={false} style={[styles.worldDiffAmount, { color: diffColor }]} maxFontSizeMultiplier={1.4}>
              {country.isHistorical || isFree || isCheaper ? '− ' : '+ '}{peso(difference)}
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.worldBody}>
          <Text style={[styles.worldPlaceholder, { color: Colors.placeholder }]}>
            Enter an amount above to see how it compares around the world.
          </Text>
        </View>
      )}

    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const HZ     = 16;
const CARD_R = 12;

const styles = StyleSheet.create({
  root:    { flex: 1 },
  scroll:  { flex: 1 },
  content: { paddingTop: 16 },

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
    borderRadius: CARD_R,
    marginHorizontal: HZ,
    overflow: 'hidden',
  },
  amountCard: { marginBottom: 24 },

  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.separatorOpaque,
    marginHorizontal: 16,
  },
  totalDivider: {
    height: 1,
    backgroundColor: Colors.separatorOpaque,
  },

  // ── Amount input ──────────────────────────────────────────────────────────
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
  captionRow: { paddingHorizontal: 16, paddingVertical: 10 },
  captionText: {
    fontSize: 13,
    fontWeight: '400',
  },

  // ── Calc rows ─────────────────────────────────────────────────────────────
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  calcHeroRow: {
    paddingVertical: 16,
    backgroundColor: 'rgba(0,122,255,0.06)',
  },
  calcLabelGroup: { flex: 1 },
  calcLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  calcHeroLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  calcNote: {
    fontSize: 12,
    marginTop: 2,
  },
  calcValue: {
    fontSize: 15,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
  calcHeroValue: {
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // ── World card ────────────────────────────────────────────────────────────
  worldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  worldFlag: {
    fontSize: 28,
    lineHeight: 32,
    flexShrink: 0,
  },
  worldHeaderInfo: { flex: 1 },
  worldHeaderCountry: {
    fontSize: 16,
    fontWeight: '600',
  },
  worldHeaderLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  worldHeaderRate: {
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 0,
  },
  worldBody: { paddingHorizontal: 16, paddingVertical: 14 },
  worldBodyText: {
    fontSize: 14,
    lineHeight: 22,
  },
  worldBodyBold: {
    fontWeight: '600',
  },
  worldPlaceholder: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingVertical: 8,
  },
  worldDiffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  worldDiffLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  worldDiffAmount: {
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // ── Save button ───────────────────────────────────────────────────────────
  saveBtnTop: {
    marginTop: 20,
    marginBottom: 4,
  },
  saveBtn: {
    marginHorizontal: HZ,
    marginTop: 28,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },

  // ── Android label modal ───────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalBox: {
    borderRadius: 16,
    padding: 20,
    gap: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  modalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: 'transparent',
  },
  modalBtnSave: {
    backgroundColor: ACCENT,
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // ── Footnote ──────────────────────────────────────────────────────────────
  footnote: {
    marginTop: 10,
    marginHorizontal: HZ,
    fontSize: 12,
    color: Colors.placeholder,
    textAlign: 'center',
    lineHeight: 18,
  },
});
