import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import { useReduceMotion } from '@/lib/useReduceMotion';

// ─── icon helper ─────────────────────────────────────────────────────────────

const SF_MAP: Record<string, string> = {
  'figure.roll': 'accessibility',
  'figure.walk': 'walk',
  'doc.text': 'document-text-outline',
  'chevron.right': 'chevron-forward',
  'clock': 'time',
  'info.circle': 'information-circle-outline',
  'person.crop.rectangle': 'card-outline',
  'cross.case': 'medkit-outline',
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

// ─── card data ───────────────────────────────────────────────────────────────

type HomeCard = {
  id: string;
  title: string;
  subtitle: string;
  icons: string[];
  bgColor: string;
  accentColor?: string;
  route: string;
};

const CARDS: HomeCard[] = [
  {
    id: 'discount',
    title: 'Discount Checker',
    subtitle: 'PWD & Senior Citizen · 20% off + VAT exemption',
    icons: ['figure.roll', 'figure.walk'],
    bgColor: Colors.pwd,
    route: '/compute?type=pwd',
  },
  {
    id: 'vat',
    title: 'VAT Calculator',
    subtitle: 'See how much tax is in your price · 12% VAT + what if 10%?',
    icons: ['doc.text'],
    bgColor: '#1B3A6B',
    route: '/vat-calculator',
  },
];

// ─── vault rows ──────────────────────────────────────────────────────────────

type VaultRow = {
  id: string;
  label: string;
  subtitle: string;
  icon: string;
  color: string;
  route: string;
};

const VAULT_ROWS: VaultRow[] = [
  { id: 'reseta',      label: 'Reseta',      subtitle: 'Prescriptions & receipts',    icon: 'cross.case',            color: Colors.accent, route: '/document-vault?type=reseta' },
  { id: 'discount-id', label: 'Discount ID', subtitle: 'PWD ID & Senior Citizen ID',  icon: 'person.crop.rectangle', color: Colors.pwd,    route: '/discount-id' },
];

// ─── screen ──────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const bg        = isDark ? Colors.dark.background  : Colors.background;
  const textColor = isDark ? Colors.dark.text        : Colors.text;
  const secondary = isDark ? Colors.dark.secondary   : '#6C6C70';
  const card      = isDark ? Colors.dark.card        : Colors.surface;
  const sep       = isDark ? Colors.dark.separator   : Colors.separatorOpaque;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={[
        styles.root,
        {
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 40,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* App header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push('/about')}
          hitSlop={8}
          accessibilityLabel="About Diskwento"
          accessibilityRole="button"
          accessibilityHint="Opens app information and version details"
          style={({ pressed }) => [styles.infoBtn, pressed && { opacity: 0.5 }]}
        >
          <Sym name="info.circle" size={24} tintColor={secondary} />
        </Pressable>
        <View accessible={false}>
          <Text
            accessibilityRole="header"
            style={[styles.appName, { color: textColor }]}
          >
            Diskwento
          </Text>
          <Text style={[styles.tagline, { color: secondary }]}>Your discount checker</Text>
        </View>
        <Pressable
          onPress={() => router.push('/history')}
          hitSlop={8}
          accessibilityLabel="Transaction History"
          accessibilityRole="button"
          accessibilityHint="Opens your saved transaction history"
          style={({ pressed }) => [styles.historyBtn, pressed && { opacity: 0.5 }]}
        >
          <Sym name="clock" size={24} tintColor={secondary} />
        </Pressable>
      </View>

      {/* Feature cards */}
      <View style={[styles.cards, { marginTop: Platform.OS === 'android' ? 24 : 0 }]}>
        {CARDS.map(c => (
          <HomeCard
            key={c.id}
            card={c}
            onPress={() => router.push(c.route as Parameters<typeof router.push>[0])}
          />
        ))}
      </View>

      {/* ── RESETA / ID section ── */}
      <Text
        accessibilityRole="header"
        style={[styles.sectionLabel, { color: secondary }]}
        allowFontScaling={false}
      >
        RESETA / ID
      </Text>
      <View style={[styles.vaultCard, { backgroundColor: card }]}>
        {VAULT_ROWS.map((row, index) => (
          <React.Fragment key={row.id}>
            {index > 0 && <View style={[styles.rowSep, { backgroundColor: sep }]} />}
            <Pressable
              accessibilityLabel={`${row.label}, ${row.subtitle}`}
              accessibilityRole="button"
              accessibilityHint={
                row.id === 'reseta'
                  ? 'Opens your saved prescriptions'
                  : 'Opens your saved PWD and Senior Citizen ID cards'
              }
              style={({ pressed }) => [styles.vaultRow, pressed && { opacity: 0.6 }]}
              onPress={() => router.push(row.route as Parameters<typeof router.push>[0])}
            >
              <View accessible={false} style={[styles.vaultIcon, { backgroundColor: row.color + '1A' }]}>
                <Sym name={row.icon} size={20} tintColor={row.color} />
              </View>
              <View accessible={false} style={{ flex: 1 }}>
                <Text style={[styles.vaultLabel, { color: textColor }]}>{row.label}</Text>
                <Text style={[styles.vaultSubtitle, { color: secondary }]}>{row.subtitle}</Text>
              </View>
              <Sym name="chevron.right" size={16} tintColor={secondary} />
            </Pressable>
          </React.Fragment>
        ))}
      </View>

      {/* Footer — decorative, hidden from VoiceOver */}
      <View
        style={styles.footerInline}
        accessibilityElementsHidden={true}
        importantForAccessibility="no-hide-descendants"
      >
        <Text style={[styles.disclaimer, { color: secondary }]} allowFontScaling={false}>
          Made with love {'&'} a little bit of Anthropic
        </Text>
        <Text style={[styles.betaLabel, { color: secondary }]} allowFontScaling={false}>Version 1.1.0</Text>
      </View>
    </ScrollView>
  );
}

// ─── card component ───────────────────────────────────────────────────────────

function HomeCard({ card, onPress }: { card: HomeCard; onPress: () => void }) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const multiIcon = card.icons.length > 1;

  return (
    <Animated.View
      style={[styles.card, { backgroundColor: card.bgColor }, animatedStyle]}
    >
      <Pressable
        style={styles.cardInner}
        onPress={onPress}
        accessibilityLabel={`${card.title}. ${card.subtitle}`}
        accessibilityRole="button"
        accessibilityHint={
          card.id === 'discount'
            ? 'Calculates your PWD or Senior Citizen discount'
            : 'Shows how much VAT is included in your price'
        }
        onPressIn={() => { if (!reduceMotion) scale.value = withSpring(0.97, { damping: 20, stiffness: 300 }); }}
        onPressOut={() => { if (!reduceMotion) scale.value = withSpring(1, { damping: 20, stiffness: 300 }); }}
      >
        {/* Decorative elements — hidden from VoiceOver */}
        <View style={styles.cardSheen} accessible={false} />
        {card.accentColor ? (
          <View style={[styles.accentBlob, { backgroundColor: card.accentColor }]} accessible={false} />
        ) : null}

        {/* Icons — hidden, already described by accessibilityLabel */}
        <View accessible={false}>
          {multiIcon ? (
            <View style={styles.iconPill}>
              {card.icons.map((icon, i) => (
                <Sym key={i} name={icon} size={26} tintColor="rgba(255,255,255,0.95)" />
              ))}
            </View>
          ) : (
            <View style={styles.iconCircle}>
              <Sym name={card.icons[0]} size={26} tintColor="rgba(255,255,255,0.95)" />
            </View>
          )}
        </View>

        {/* Text — absorbed by parent Pressable label */}
        <View accessible={false} style={styles.cardText}>
          <Text style={styles.cardTitle}>{card.title}</Text>
          <Text style={styles.cardSubtitle} allowFontScaling={false}>{card.subtitle}</Text>
        </View>

        <View accessible={false}>
          <Sym name="chevron.right" size={16} tintColor="rgba(255,255,255,0.55)" />
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  infoBtn: { paddingTop: 6 },
  historyBtn: { paddingTop: 6 },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 48,
  },
  tagline: {
    fontSize: 17,
    marginTop: 4,
    fontWeight: '400',
  },

  cards: { gap: 16 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 32,
    marginBottom: 8,
    marginHorizontal: 4,
  },

  vaultCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },

  vaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 62,
    gap: 14,
  },

  vaultIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  vaultLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  vaultSubtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },

  rowSep: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 66,
  },

  card: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 20,
    overflow: 'hidden',
    gap: 14,
  },

  cardSheen: {
    position: 'absolute',
    top: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  accentBlob: {
    position: 'absolute',
    bottom: -55,
    right: -55,
    width: 170,
    height: 170,
    borderRadius: 85,
    opacity: 0.52,
  },

  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 24,
    paddingVertical: 9,
    paddingHorizontal: 10,
    gap: 2,
    alignItems: 'center',
    flexShrink: 0,
  },
  cardText: { flex: 1 },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.70)',
    marginTop: 5,
    lineHeight: 18,
  },

  footerInline: {
    alignItems: 'center',
    marginTop: 32,
  },
  disclaimer: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  },
  betaLabel: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});
