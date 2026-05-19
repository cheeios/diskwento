import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
import { computeDiscount, DiscountType, LineItem } from '@/lib/discount';

// ─── icon helper ─────────────────────────────────────────────────────────────

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
  const map: Record<string, string> = { xmark: 'close' };
  return (
    <Ionicons
      name={(map[name] || 'help-circle') as any}
      size={size}
      color={tintColor}
      style={style}
    />
  );
}

// ─── types ───────────────────────────────────────────────────────────────────

type ItemState = {
  id: number;
  name: string;
  price: string;
  vatInclusive: boolean;
};

type ItemPatch = Partial<Omit<ItemState, 'id'>>;

// ─── helpers ─────────────────────────────────────────────────────────────────

let _uid = 0;
function makeItem(): ItemState {
  return { id: ++_uid, name: '', price: '', vatInclusive: true };
}

function peso(n: number) {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function ComputeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: string }>();

  const isDark    = useColorScheme() === 'dark';
  const bg        = isDark ? Colors.dark.background : Colors.background;
  const card      = isDark ? Colors.dark.card       : Colors.surface;
  const text      = isDark ? Colors.dark.text       : Colors.text;
  const secondary = isDark ? Colors.dark.secondary  : Colors.textSecondary;

  const [txName, setTxName] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>(
    type === 'senior' ? 'senior' : 'pwd',
  );
  const [items, setItems] = useState<ItemState[]>([makeItem()]);

  const lineItems = useMemo<LineItem[]>(
    () =>
      items.map(i => ({
        name: i.name,
        price: parseFloat(i.price) || 0,
        quantity: 1,
        vatInclusive: i.vatInclusive,
      })),
    [items],
  );

  const result = useMemo(() => computeDiscount(lineItems), [lineItems]);
  const hasValidItems = lineItems.some(i => i.price > 0);

  function addItem() {
    setItems(prev => [...prev, makeItem()]);
  }

  function removeItem(id: number) {
    setItems(prev => (prev.length > 1 ? prev.filter(i => i.id !== id) : prev));
  }

  function updateItem(id: number, patch: ItemPatch) {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)));
  }

  async function handleCheckResult() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/result',
      params: {
        txName,
        discountType,
        originalTotal: String(result.originalTotal),
        computedTotal: String(result.computedTotal),
        discountAmount: String(result.discountAmount),
        vatDeducted: String(result.vatDeducted),
        discrepancy: String(result.discrepancy),
      },
    });
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Compute Discount',
          headerLargeTitle: true,
          headerStyle: { backgroundColor: bg },
          headerTintColor: Colors.accent,
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

          {/* ── 1. Transaction name ──────────────────────────────── */}
          <SectionLabel text="TRANSACTION" />
          <View style={[styles.card, { backgroundColor: card }]}>
            <TextInput
              style={[styles.txInput, { color: text }]}
              placeholder="e.g. Jollibee, Mercury Drug"
              placeholderTextColor={Colors.placeholder}
              value={txName}
              onChangeText={setTxName}
              returnKeyType="done"
              clearButtonMode="while-editing"
              accessibilityLabel="Transaction name"
              accessibilityHint="Enter the name of the establishment"
            />
          </View>

          {/* ── 2. Discount type ─────────────────────────────────── */}
          <SectionLabel text="DISCOUNT TYPE" />
          <View style={[styles.card, { backgroundColor: card }]}>
            <SegmentedControl
              options={[
                { label: 'PWD',            value: 'pwd'    as DiscountType, color: Colors.accent },
                { label: 'Senior Citizen', value: 'senior' as DiscountType, color: Colors.accent },
              ]}
              selected={discountType}
              onSelect={setDiscountType}
              isDark={isDark}
              card={card}
              secondary={secondary}
            />
          </View>

          {/* ── 3. Items ─────────────────────────────────────────── */}
          <SectionLabel text="ITEMS" />
          <View style={[styles.card, { backgroundColor: card }]}>
            {items.map((item, index) => (
              <React.Fragment key={item.id}>
                {index > 0 && <View style={[styles.itemDivider, { backgroundColor: bg }]} />}
                <ItemRow
                  item={item}
                  index={index}
                  accentColor={Colors.accent}
                  canRemove={items.length > 1}
                  onRemove={() => removeItem(item.id)}
                  onChange={patch => updateItem(item.id, patch)}
                  text={text}
                  secondary={secondary}
                />
              </React.Fragment>
            ))}

            <Hairline />
            <Pressable
              style={({ pressed }) => [styles.addRow, pressed && { opacity: 0.5 }]}
              onPress={addItem}
              accessibilityLabel="Add item"
              accessibilityRole="button"
              accessibilityHint="Adds another item to the list"
            >
              <Text accessible={false} style={[styles.addIcon, { color: Colors.accent }]}>+</Text>
              <Text accessible={false} style={[styles.addLabel, { color: Colors.accent }]}>Add Item</Text>
            </Pressable>
          </View>

          {/* ── 4. Summary ───────────────────────────────────────── */}
          <SectionLabel text="SUMMARY" />
          <View style={[styles.card, { backgroundColor: card }]}>
            <SummaryRow label="Original Total" value={peso(result.originalTotal)} text={text} secondary={secondary} />
            <Hairline />
            <SummaryRow
              label="VAT Deducted"
              value={`− ${peso(result.vatDeducted)}`}
              valueColor={Colors.danger}
              text={text}
              secondary={secondary}
            />
            <Hairline />
            <SummaryRow
              label="Discount (20%)"
              value={`− ${peso(result.discountAmount)}`}
              valueColor={Colors.danger}
              text={text}
              secondary={secondary}
            />
            <View style={styles.totalDivider} />
            <SummaryRow
              label="Amount to Pay"
              value={peso(result.computedTotal)}
              valueColor={Colors.success}
              hero
              text={text}
              secondary={secondary}
            />
          </View>

          {/* ── 5. Primary action ────────────────────────────────── */}
          <Pressable
            style={({ pressed }) => [
              styles.checkBtn,
              { backgroundColor: Colors.accent },
              pressed && { opacity: 0.85 },
              !hasValidItems && styles.checkBtnDisabled,
            ]}
            onPress={handleCheckResult}
            disabled={!hasValidItems}
            accessibilityLabel="Compare Result"
            accessibilityRole="button"
            accessibilityState={{ disabled: !hasValidItems }}
            accessibilityHint="Compares your computation against what the establishment charged"
          >
            <Text style={styles.checkBtnText}>Compare Result</Text>
          </Pressable>

          {!hasValidItems && (
            <Text style={[styles.hint, { color: Colors.placeholder }]}>
              Enter at least one item price to continue.
            </Text>
          )}

          <Text
            style={styles.legalFooter}
            allowFontScaling={false}
            accessibilityElementsHidden={true}
            importantForAccessibility="no"
          >
            {'Based on RA 9994 (Expanded Senior Citizens Act)\nand RA 7277 (Magna Carta for Persons\nwith Disability)'}
          </Text>

        </ScrollView>
      </View>
    </>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  const isDark = useColorScheme() === 'dark';
  const color  = isDark ? Colors.dark.secondary : Colors.textSecondary;
  return (
    <Text
      accessibilityRole="header"
      style={[styles.sectionLabel, { color }]}
      allowFontScaling={false}
    >
      {text}
    </Text>
  );
}

function Hairline() {
  return <View style={styles.hairline} />;
}

function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
  isDark,
  card,
  secondary,
}: {
  options: { label: string; value: T; color: string }[];
  selected: T;
  onSelect: (v: T) => void;
  isDark: boolean;
  card: string;
  secondary: string;
}) {
  const trackBg = isDark ? '#3A3A3C' : '#E5E5EA';
  return (
    <View style={[styles.segTrack, { backgroundColor: trackBg }]}>
      {options.map(opt => {
        const active = opt.value === selected;
        return (
          <Pressable
            key={opt.value}
            accessibilityLabel={opt.label}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.segThumb,
              active && [styles.segThumbActive, { backgroundColor: card, shadowColor: opt.color }],
              pressed && !active && { opacity: 0.5 },
            ]}
            onPress={() => onSelect(opt.value)}
          >
            <Text
              style={[
                styles.segLabel,
                { color: secondary },
                active && { color: opt.color, fontWeight: '700' },
              ]}
              allowFontScaling={false}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ItemRow({
  item,
  index,
  accentColor,
  canRemove,
  onRemove,
  onChange,
  text,
  secondary,
}: {
  item: ItemState;
  index: number;
  accentColor: string;
  canRemove: boolean;
  onRemove: () => void;
  onChange: (patch: ItemPatch) => void;
  text: string;
  secondary: string;
}) {
  const itemLabel = `Item ${index + 1}`;
  return (
    <>
      <View style={styles.nameRow}>
        <Text accessible={false} style={[styles.itemNum, { color: Colors.placeholder }]}>{index + 1}.</Text>
        <TextInput
          style={[styles.nameInput, { color: text }]}
          placeholder="Item name (optional)"
          placeholderTextColor={Colors.placeholder}
          value={item.name}
          onChangeText={t => onChange({ name: t })}
          returnKeyType="next"
          accessibilityLabel={`${itemLabel} name`}
          accessibilityHint="Optional item description"
        />
        {canRemove && (
          <Pressable
            onPress={onRemove}
            hitSlop={12}
            accessibilityLabel={`Remove ${itemLabel}`}
            accessibilityRole="button"
            style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.4 }]}
          >
            <Sym name="xmark" size={15} tintColor={Colors.danger} />
          </Pressable>
        )}
      </View>

      <Hairline />

      <View style={styles.priceRow}>
        <Text accessible={false} style={[styles.currencySign, { color: accentColor }]}>₱</Text>
        <TextInput
          style={[styles.priceInput, { color: text }]}
          placeholder="0.00"
          placeholderTextColor={Colors.placeholder}
          value={item.price}
          onChangeText={t => onChange({ price: t })}
          keyboardType="decimal-pad"
          returnKeyType="done"
          selectTextOnFocus
          maxFontSizeMultiplier={1.4}
          accessibilityLabel={`${itemLabel} price in pesos`}
          accessibilityHint="Enter the price as shown on the menu or receipt"
        />
        <View style={styles.vatGroup}>
          <Text accessible={false} style={[styles.vatLabel, { color: secondary }]} allowFontScaling={false}>VAT-incl.</Text>
          <Switch
            value={item.vatInclusive}
            onValueChange={val => onChange({ vatInclusive: val })}
            trackColor={{ true: Colors.accent, false: Colors.separator }}
            thumbColor={Platform.OS === 'android' ? Colors.surface : undefined}
            accessibilityLabel={`${itemLabel} is VAT inclusive`}
            accessibilityHint="Toggle if the price already includes VAT"
          />
        </View>
      </View>
    </>
  );
}

function SummaryRow({
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
      style={[styles.summaryRow, hero && styles.summaryHeroRow]}
    >
      <Text accessible={false} style={[styles.summaryLabel, { color: secondary }, hero && styles.summaryHeroLabel, hero && { color: text }]}>
        {label}
      </Text>
      <Text
        accessible={false}
        style={[
          styles.summaryValue,
          { color: text },
          hero && styles.summaryHeroValue,
          valueColor ? { color: valueColor } : null,
        ]}
        maxFontSizeMultiplier={hero ? 1.4 : 1.5}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const HZ     = 16;
const CARD_R = 12;
const BTN_R  = 14;

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
    borderRadius: CARD_R,
    marginHorizontal: HZ,
    overflow: 'hidden',
  },

  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.separatorOpaque,
    marginHorizontal: 16,
  },

  itemDivider: { height: 8 },

  txInput: {
    fontSize: 17,
    paddingHorizontal: 16,
    paddingVertical: 13,
    minHeight: 44,
  },

  segTrack: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    margin: 8,
    gap: 2,
  },
  segThumb: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segThumbActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.20,
    shadowRadius: 3,
    elevation: 2,
  },
  segLabel: {
    fontSize: 15,
    fontWeight: '500',
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 44,
    gap: 8,
  },
  itemNum: {
    fontSize: 15,
    fontWeight: '600',
    width: 20,
    textAlign: 'right',
  },
  nameInput: {
    flex: 1,
    fontSize: 17,
    paddingVertical: 12,
  },
  removeBtn: { padding: 4 },

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
  vatGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  vatLabel: {
    fontSize: 13,
    fontWeight: '500',
  },

  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 44,
    gap: 10,
  },
  addIcon: {
    fontSize: 22,
    fontWeight: '300',
    width: 24,
    textAlign: 'center',
    lineHeight: 26,
  },
  addLabel: {
    fontSize: 17,
    fontWeight: '600',
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
  },

  totalDivider: {
    height: 1,
    backgroundColor: Colors.separatorOpaque,
  },

  summaryHeroRow: {
    paddingVertical: 16,
    backgroundColor: 'rgba(52, 199, 89, 0.07)',
  },
  summaryHeroLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  summaryHeroValue: {
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  checkBtn: {
    marginHorizontal: HZ,
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: BTN_R,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius: 8,
    elevation: 4,
  },
  checkBtnDisabled: { opacity: 0.38, shadowOpacity: 0 },
  checkBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },

  hint: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },

  legalFooter: {
    fontSize: 12,
    color: Colors.placeholder,
    textAlign: 'center',
    marginTop: 16,
    marginHorizontal: HZ,
    lineHeight: 18,
  },
});
