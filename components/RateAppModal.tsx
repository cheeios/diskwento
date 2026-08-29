import React, { useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import { markRateStatus, openStoreForRating } from '@/lib/rateApp';

const SF_MAP: Record<string, string> = {
  'star.fill':          'star',
  'hand.thumbsup.fill': 'thumbs-up',
  'envelope.fill':      'mail',
};

function Sym({ name, size, tintColor }: { name: string; size: number; tintColor: string }) {
  if (Platform.OS === 'ios') {
    return <SymbolView name={name as any} size={size} tintColor={tintColor} accessible={false} />;
  }
  return <Ionicons name={(SF_MAP[name] || 'help-circle') as any} size={size} color={tintColor} accessible={false} />;
}

export function RateAppModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';

  const bg        = isDark ? Colors.dark.card : Colors.surface;
  const text       = isDark ? Colors.dark.text : Colors.text;
  const secondary  = isDark ? Colors.dark.secondary : Colors.textSecondary;

  const [step, setStep] = useState<'ask' | 'declined'>('ask');

  function reset() {
    setTimeout(() => setStep('ask'), 300);
  }

  async function handleYes() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await markRateStatus('rated');
    openStoreForRating();
    onClose();
    reset();
  }

  async function handleNo() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await markRateStatus('declined');
    setStep('declined');
  }

  function handleSendFeedback() {
    Linking.openURL('mailto:hello@diskwento.app?subject=Diskwento%20Feedback');
    onClose();
    reset();
  }

  function handleDismiss() {
    onClose();
    reset();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" accessibilityViewIsModal={true}>
      <Pressable style={styles.overlay} onPress={handleDismiss} />
      <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + 24 }]}>
        <View accessible={false} style={styles.handle} />

        {step === 'ask' ? (
          <>
            <Sym name="star.fill" size={48} tintColor={Colors.warning} />
            <Text style={[styles.title, { color: text, marginTop: 16 }]}>Enjoying Diskwento?</Text>
            <Text style={[styles.sub, { color: secondary }]}>
              Your rating helps other Senior Citizens and PWDs find this app.
            </Text>

            <Pressable
              accessibilityLabel="Yes, I enjoy the app"
              accessibilityRole="button"
              style={({ pressed }) => [styles.btnFill, pressed && { opacity: 0.85 }]}
              onPress={handleYes}
            >
              <Text style={styles.btnFillText}>Yes, I love it!</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Not really enjoying the app"
              accessibilityRole="button"
              style={({ pressed }) => [styles.btnGhost, pressed && { opacity: 0.7 }]}
              onPress={handleNo}
            >
              <Text style={[styles.btnGhostText, { color: secondary }]}>Not really</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Sym name="envelope.fill" size={48} tintColor={Colors.accent} />
            <Text style={[styles.title, { color: text, marginTop: 16 }]}>Help us improve</Text>
            <Text style={[styles.sub, { color: secondary }]}>
              We are sorry to hear that. Tell us what is wrong and we will do our best to fix it.
            </Text>

            <Pressable
              accessibilityLabel="Send feedback by email"
              accessibilityRole="button"
              style={({ pressed }) => [styles.btnFill, pressed && { opacity: 0.85 }]}
              onPress={handleSendFeedback}
            >
              <Text style={styles.btnFillText}>Send Feedback</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Dismiss"
              accessibilityRole="button"
              style={({ pressed }) => [styles.btnGhost, pressed && { opacity: 0.7 }]}
              onPress={handleDismiss}
            >
              <Text style={[styles.btnGhostText, { color: secondary }]}>Maybe Later</Text>
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.40)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.separator,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  btnFill: {
    width: '100%',
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  btnFillText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  btnGhost: {
    width: '100%',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhostText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
