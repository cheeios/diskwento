import React, { useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import {
  SavedTransaction,
  VatTransaction,
  getTransactions,
  getVatTransactions,
  deleteTransaction,
  deleteVatTransaction,
  clearAllTransactions,
  clearAllVatTransactions,
  formatTransactionDate,
} from '@/lib/storage';

type HistoryItem =
  | { kind: 'discount'; data: SavedTransaction }
  | { kind: 'vat'; data: VatTransaction };

// ─── icon helper ─────────────────────────────────────────────────────────────

const SF_MAP: Record<string, string> = {
  'clock.arrow.circlepath':      'refresh',
  'trash.fill':                  'trash',
  'checkmark.circle.fill':       'checkmark-circle',
  'exclamationmark.circle.fill': 'alert-circle',
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

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const isDark    = useColorScheme() === 'dark';
  const bg        = isDark ? Colors.dark.background : Colors.background;
  const text      = isDark ? Colors.dark.text       : Colors.text;
  const secondary = isDark ? Colors.dark.secondary  : Colors.textSecondary;

  const [items, setItems]           = useState<HistoryItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const [discountTxs, vatTxs] = await Promise.all([getTransactions(), getVatTransactions()]);
    const merged: HistoryItem[] = [
      ...discountTxs.map(d => ({ kind: 'discount' as const, data: d })),
      ...vatTxs.map(v => ({ kind: 'vat' as const, data: v })),
    ].sort((a, b) => b.data.timestamp - a.data.timestamp);
    setItems(merged);
    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleDelete(item: HistoryItem) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setItems(prev => prev.filter(i => i.data.id !== item.data.id));
    if (item.kind === 'discount') await deleteTransaction(item.data.id);
    else await deleteVatTransaction(item.data.id);
  }

  async function handleClearAll() {
    Alert.alert(
      'Clear All',
      'Clear all saved transactions? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await Promise.all([clearAllTransactions(), clearAllVatTransactions()]);
            setItems([]);
          },
        },
      ]
    );
  }

  const listHeader = (
    <View style={styles.listHeaderContainer}>
      <Text style={[styles.listHeader, { color: secondary }]} allowFontScaling={false}>
        {items.length} transaction{items.length !== 1 ? 's' : ''} · Auto-deleted after 2 days
      </Text>
      <Text accessible={false} style={[styles.swipeHint, { color: Colors.placeholder }]} allowFontScaling={false}>
        Swipe left on a transaction to delete it.
      </Text>
    </View>
  );

  const listFooter = (
    <Pressable
      accessibilityLabel="Clear all transactions"
      accessibilityRole="button"
      accessibilityHint="Permanently removes all saved transactions"
      style={({ pressed }) => [styles.clearAllBtn, pressed && { opacity: 0.6 }]}
      onPress={handleClearAll}
    >
      <Text accessible={false} style={[styles.clearAllText, { color: secondary }]}>Clear All</Text>
    </Pressable>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'History',
          headerLargeTitle: true,
          headerStyle: { backgroundColor: bg },
          headerShadowVisible: false,
          headerLargeTitleStyle: { color: text },
        }}
      />
      <View style={[styles.root, { backgroundColor: bg }]}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.accent} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.center}>
            <Sym accessible={false} name="clock.arrow.circlepath" size={48} tintColor={Colors.placeholder} />
            <Text style={[styles.emptyTitle, { color: text }]}>No Saved Transactions</Text>
            <Text style={[styles.emptySub, { color: secondary }]}>
              {'Your saved discount and VAT computations will appear here. Transactions are kept for 2 days.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => item.data.id}
            renderItem={({ item }) =>
              item.kind === 'discount'
                ? <TransactionRow tx={item.data} onDelete={() => handleDelete(item)} />
                : <VatRow tx={item.data} onDelete={() => handleDelete(item)} />
            }
            ListHeaderComponent={listHeader}
            ListFooterComponent={listFooter}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.accent}
              />
            }
          />
        )}
      </View>
    </>
  );
}

// ─── TransactionRow ───────────────────────────────────────────────────────────

function TransactionRow({
  tx,
  onDelete,
}: {
  tx: SavedTransaction;
  onDelete: () => void;
}) {
  const swipeRef = useRef<Swipeable>(null);
  const isDark    = useColorScheme() === 'dark';
  const card      = isDark ? Colors.dark.card      : Colors.surface;
  const bg        = isDark ? Colors.dark.background : Colors.background;
  const text      = isDark ? Colors.dark.text       : Colors.text;
  const secondary = isDark ? Colors.dark.secondary  : Colors.textSecondary;

  const isPWD     = tx.discountType === 'pwd';
  const pillLabel = isPWD ? 'PWD' : 'Senior';

  const rowLabel = [
    tx.name,
    formatTransactionDate(tx.timestamp),
    `${pillLabel} discount`,
    peso(tx.computedTotal),
    tx.isCorrect ? 'charged correctly' : `overcharged by ${peso(tx.discrepancy)}`,
    tx.reported && tx.reportId ? `reported, reference ${tx.reportId}` : null,
  ].filter(Boolean).join(', ');

  function renderRightActions() {
    return (
      <Pressable
        accessibilityLabel={`Delete ${tx.name}`}
        accessibilityRole="button"
        style={styles.deleteAction}
        onPress={() => {
          swipeRef.current?.close();
          onDelete();
        }}
      >
        <Sym accessible={false} name="trash.fill" size={20} tintColor="#fff" />
        <Text accessible={false} style={styles.deleteActionText} allowFontScaling={false}>Delete</Text>
      </Pressable>
    );
  }

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <View
        accessible={true}
        accessibilityLabel={rowLabel}
        accessibilityActions={[{ name: 'delete', label: 'Delete' }]}
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === 'delete') onDelete();
        }}
        style={[styles.txRow, { backgroundColor: card }]}
      >
        <View accessible={false} style={styles.txTop}>
          <View style={styles.txNameGroup}>
            <Text style={[styles.txName, { color: text }]} numberOfLines={1} ellipsizeMode="tail">{tx.name}</Text>
            {tx.reported && tx.reportId ? (
              <View style={styles.reportedBadge}>
                <Text style={styles.reportedBadgeText} allowFontScaling={false}>Reported · {tx.reportId}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.txDate, { color: secondary }]} allowFontScaling={false}>{formatTransactionDate(tx.timestamp)}</Text>
        </View>
        <View accessible={false} style={styles.txBottom}>
          <View style={styles.txLeft}>
            <View style={[styles.typePill, { backgroundColor: bg }]}>
              <Text style={[styles.typePillText, { color: text }]} allowFontScaling={false}>{pillLabel}</Text>
            </View>
            <Text style={[styles.txAmount, { color: text }]} maxFontSizeMultiplier={1.2}>{peso(tx.computedTotal)}</Text>
          </View>
          {tx.isCorrect ? (
            <View style={styles.txStatusRow}>
              <Sym name="checkmark.circle.fill" size={14} tintColor={Colors.success} />
              <Text style={[styles.txStatus, { color: Colors.success }]}>Correct</Text>
            </View>
          ) : (
            <View style={styles.txStatusRow}>
              <Sym name="exclamationmark.circle.fill" size={14} tintColor={Colors.danger} />
              <Text style={[styles.txStatus, { color: Colors.danger }]}>
                {peso(tx.discrepancy)} overcharged
              </Text>
            </View>
          )}
        </View>
      </View>
    </Swipeable>
  );
}

// ─── VatRow ───────────────────────────────────────────────────────────────────

function VatRow({ tx, onDelete }: { tx: VatTransaction; onDelete: () => void }) {
  const swipeRef = useRef<Swipeable>(null);
  const isDark    = useColorScheme() === 'dark';
  const card      = isDark ? Colors.dark.card      : Colors.surface;
  const bg        = isDark ? Colors.dark.background : Colors.background;
  const text      = isDark ? Colors.dark.text       : Colors.text;
  const secondary = isDark ? Colors.dark.secondary  : Colors.textSecondary;

  const rowLabel = `${tx.label}, ${formatTransactionDate(tx.timestamp)}, VAT Calculator, ${peso(tx.price)}, ${peso(tx.exVat)} ex-VAT plus ${peso(tx.vatAmount)} tax`;

  function renderRightActions() {
    return (
      <Pressable
        accessibilityLabel={`Delete ${tx.label}`}
        accessibilityRole="button"
        style={styles.deleteAction}
        onPress={() => { swipeRef.current?.close(); onDelete(); }}
      >
        <Sym accessible={false} name="trash.fill" size={20} tintColor="#fff" />
        <Text accessible={false} style={styles.deleteActionText} allowFontScaling={false}>Delete</Text>
      </Pressable>
    );
  }

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false} friction={2}>
      <View
        accessible={true}
        accessibilityLabel={rowLabel}
        accessibilityActions={[{ name: 'delete', label: 'Delete' }]}
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === 'delete') onDelete();
        }}
        style={[styles.txRow, { backgroundColor: card }]}
      >
        <View accessible={false} style={styles.txTop}>
          <Text style={[styles.txName, { color: text }]} numberOfLines={1} ellipsizeMode="tail">
            {tx.label}
          </Text>
          <Text style={[styles.txDate, { color: secondary }]} allowFontScaling={false}>
            {formatTransactionDate(tx.timestamp)}
          </Text>
        </View>
        <View accessible={false} style={styles.txBottom}>
          <View style={styles.txLeft}>
            <View style={[styles.vatPill, { backgroundColor: Colors.accentLight }]}>
              <Text style={styles.vatPillText} allowFontScaling={false}>VAT</Text>
            </View>
            <Text style={[styles.txAmount, { color: text }]} maxFontSizeMultiplier={1.2}>
              {peso(tx.price)}
            </Text>
          </View>
          <Text style={[styles.vatBreakdown, { color: secondary }]} allowFontScaling={false}>
            {peso(tx.exVat)} + {peso(tx.vatAmount)} tax
          </Text>
        </View>
      </View>
    </Swipeable>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const HZ = 16;

const styles = StyleSheet.create({
  root: { flex: 1 },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  listContent: {},

  listHeaderContainer: { paddingTop: 8 },
  listHeader: {
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: 20,
    paddingBottom: 2,
  },
  swipeHint: {
    fontSize: 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },

  // ── Transaction row ───────────────────────────────────────────────────────
  txRow: {
    paddingHorizontal: HZ,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separatorOpaque,
    gap: 8,
  },
  txTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  txNameGroup: {
    flex: 1,
    gap: 4,
  },
  txName: {
    fontSize: 16,
    fontWeight: '600',
  },
  reportedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F0FD',
    borderRadius: 100,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  reportedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0071E3',
    letterSpacing: 0.1,
  },
  txDate: {
    fontSize: 13,
    flexShrink: 0,
  },
  txBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  txStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  txStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  typePill: {
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  vatPill: {
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  vatPillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: Colors.accent,
  },
  vatBreakdown: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },

  // ── Swipe delete action ───────────────────────────────────────────────────
  deleteAction: {
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    gap: 4,
  },
  deleteActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Clear all ─────────────────────────────────────────────────────────────
  clearAllBtn: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 8,
  },
  clearAllText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
