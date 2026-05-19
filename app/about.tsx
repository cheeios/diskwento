import React from 'react';
import {
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';

// ─── shared sub-components ───────────────────────────────────────────────────

function Chevron({ color }: { color: string }) {
  if (Platform.OS === 'ios') {
    return <SymbolView name="chevron.right" size={13} tintColor={color} accessible={false} />;
  }
  return <Ionicons name="chevron-forward" size={13} color={color} accessible={false} />;
}

function RowSeparator({ color }: { color: string }) {
  return <View style={[styles.separator, { backgroundColor: color }]} />;
}

function SectionLabel({ title, color }: { title: string; color: string }) {
  return (
    <Text accessibilityRole="header" style={[styles.sectionLabel, { color }]}>{title}</Text>
  );
}

// Tappable link row: label left, chevron right
function LinkRow({
  label,
  url,
  textColor,
  secondary,
}: {
  label: string;
  url: string;
  textColor: string;
  secondary: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="link"
      onPress={() => Linking.openURL(url)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.5 }]}
    >
      <Text accessible={false} style={[styles.rowLabel, { color: textColor }]}>{label}</Text>
      <Chevron color={secondary} />
    </Pressable>
  );
}

// Static (non-tappable) row: label left, value right
function StaticRow({
  label,
  value,
  textColor,
  secondary,
}: {
  label: string;
  value: string;
  textColor: string;
  secondary: string;
}) {
  return (
    <View
      accessible={true}
      accessibilityLabel={`${label}, ${value}`}
      style={styles.row}
    >
      <Text accessible={false} style={[styles.rowLabel, { color: textColor }]}>{label}</Text>
      <Text accessible={false} style={[styles.rowValue, { color: secondary }]}>{value}</Text>
    </View>
  );
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function AboutScreen() {
  const insets    = useSafeAreaInsets();
  const isDark    = useColorScheme() === 'dark';

  const bg        = isDark ? Colors.dark.background : Colors.background;
  const card      = isDark ? Colors.dark.card       : Colors.surface;
  const textColor = isDark ? Colors.dark.text       : Colors.text;
  const secondary = isDark ? Colors.dark.secondary  : '#6C6C70';
  const sep       = isDark ? Colors.dark.separator  : Colors.separator;

  const cardStyle = [styles.sectionCard, { backgroundColor: card }];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: bg }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 32 },
      ]}
      automaticallyAdjustKeyboardInsets
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Image
          accessible={false}
          source={require('../assets/images/icon.png')}
          style={styles.appIcon}
        />
        <Text style={[styles.appName, { color: textColor }]}>
          Diskwento Mobile App PH
        </Text>
        <Text style={[styles.version, { color: secondary }]}>
          Version 1.1.0
        </Text>
      </View>

      {/* ── Developer ──────────────────────────────────────────────── */}
      <SectionLabel title="DEVELOPER" color={secondary} />
      <View style={cardStyle}>
        <StaticRow
          label="Developer"
          value="Carlo Corcuera"
          textColor={textColor}
          secondary={secondary}
        />
        <RowSeparator color={sep} />
        <LinkRow
          label="Website"
          url="https://diskwento.app"
          textColor={textColor}
          secondary={secondary}
        />
        <RowSeparator color={sep} />
        <LinkRow
          label="Email"
          url="mailto:hello@diskwento.app"
          textColor={textColor}
          secondary={secondary}
        />
        <RowSeparator color={sep} />
        <LinkRow
          label="Facebook"
          url="https://facebook.com/diskwentoapp"
          textColor={textColor}
          secondary={secondary}
        />
      </View>

      {/* ── Legal ──────────────────────────────────────────────────── */}
      <SectionLabel title="LEGAL" color={secondary} />
      <View style={cardStyle}>
        <LinkRow
          label="Privacy Policy"
          url="https://diskwento.app/#privacy"
          textColor={textColor}
          secondary={secondary}
        />
        <RowSeparator color={sep} />
        <LinkRow
          label="Terms of Service"
          url="https://diskwento.app/#terms"
          textColor={textColor}
          secondary={secondary}
        />
      </View>

      {/* ── Support ────────────────────────────────────────────────── */}
      <SectionLabel title="SUPPORT" color={secondary} />
      <View style={cardStyle}>
        <LinkRow
          label="Send Feedback"
          url="https://diskwento.app/feedback"
          textColor={textColor}
          secondary={secondary}
        />
        <RowSeparator color={sep} />
        <LinkRow
          label="Contact Us"
          url="mailto:hello@diskwento.app"
          textColor={textColor}
          secondary={secondary}
        />
        <RowSeparator color={sep} />
        <LinkRow
          label="Report a Bug"
          url="mailto:hello@diskwento.app?subject=Bug%20Report%20%E2%80%94%20Diskwento%20v1.1.0"
          textColor={textColor}
          secondary={secondary}
        />
      </View>

      {/* ── Credits ────────────────────────────────────────────────── */}
      <SectionLabel title="CREDITS" color={secondary} />
      <View style={cardStyle}>
        <View
          style={styles.creditsRow}
          accessibilityElementsHidden={true}
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={[styles.creditsMain, { color: secondary }]}>
            Made with love {'&'} a little bit of Anthropic
          </Text>
          <Text style={[styles.creditsLegal, { color: Colors.textTertiary }]}>
            Based on RA 9994 (Expanded Senior Citizens Act) and RA 7277
            (Magna Carta for Persons with Disability)
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  content: {
    paddingTop: 24,
    paddingHorizontal: 16,
  },

  // ── header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appIcon: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  version: {
    fontSize: 13,
    textAlign: 'center',
  },

  // ── section chrome
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 6,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },

  // ── rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: 16,
  },
  rowLabel: {
    fontSize: 16,
  },
  rowValue: {
    fontSize: 16,
  },

  // ── credits block
  creditsRow: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  creditsMain: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  creditsLegal: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
