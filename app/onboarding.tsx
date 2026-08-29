import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/colors';
import { useReduceMotion } from '@/lib/useReduceMotion';

const { width: W } = Dimensions.get('window');
export const ONBOARDING_KEY = 'diskwento_onboarded';

type SlideData = {
  id: string;
  title: string;
  body: string;
  iconColor: string;
  icon?: string;
  isWelcome?: boolean;
  subtitle?: string;
  note?: string;
};

const SLIDES: SlideData[] = [
  {
    id: 'welcome',
    isWelcome: true,
    title: 'Welcome to Diskwento',
    subtitle: 'Your rights. In your hands.',
    body: 'The free discount checker for PWD and Senior Citizens in the Philippines.',
    note: 'Based on RA 9994 and RA 7277',
    iconColor: Colors.pwd,
  },
  {
    id: 'how',
    icon: 'receipt',
    title: 'After Your Receipt',
    body: 'Once your transaction is complete and receipt is issued, open Diskwento to verify if your 20% discount and VAT exemption were correctly applied.',
    note: 'Always verify AFTER paying — a completed transaction is required to file a valid complaint.',
    iconColor: Colors.pwd,
  },
  {
    id: 'compare',
    icon: 'checkmark.seal',
    title: 'Compare & Report',
    body: 'Enter your items and the amount charged on your receipt. If overcharged, file a formal complaint to DTI or your local PDAO/OSCA with one tap.',
    iconColor: Colors.accent,
  },
  {
    id: 'vat',
    icon: 'percent',
    title: 'Know Your Taxes Too',
    body: 'Use the VAT Calculator to see exactly how much tax is embedded in any price — and compare it to other countries around the world.',
    iconColor: Colors.accent,
  },
];

const SF_ICON_MAP: Record<string, string> = {
  receipt: 'receipt-outline',
  'checkmark.seal': 'shield-checkmark',
  percent: 'calculator',
};

function SlideSymbol({ name, size, color }: { name: string; size: number; color: string }) {
  if (Platform.OS === 'ios') {
    return <SymbolView name={name as any} size={size} tintColor={color} />;
  }
  return (
    <Ionicons
      name={(SF_ICON_MAP[name] ?? 'help-circle') as any}
      size={size}
      color={color}
    />
  );
}

function Dot({ active }: { active: boolean }) {
  const reduceMotion = useReduceMotion();
  const widthVal = useSharedValue(active ? 20 : 8);

  useEffect(() => {
    widthVal.value = reduceMotion
      ? (active ? 20 : 8)
      : withTiming(active ? 20 : 8, { duration: 250 });
  }, [active, widthVal, reduceMotion]);

  const animStyle = useAnimatedStyle(() => ({ width: widthVal.value }));

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: active ? Colors.accent : '#8E8E93' },
        animStyle,
      ]}
    />
  );
}

function Slide({
  slide,
  height,
  textColor,
  secondary,
}: {
  slide: SlideData;
  height: number;
  textColor: string;
  secondary: string;
}) {
  return (
    <View style={[styles.slide, { height }]}>
      <View accessible={false} style={styles.iconWrap}>
        {slide.isWelcome ? (
          <Image
            accessible={false}
            source={require('@/assets/images/icon.png')}
            style={styles.appIcon}
          />
        ) : (
          <SlideSymbol name={slide.icon!} size={64} color={slide.iconColor} />
        )}
      </View>

      <Text accessibilityRole="header" style={[styles.title, { color: textColor }]}>{slide.title}</Text>

      {slide.subtitle ? (
        <Text style={[styles.subtitle, { color: slide.iconColor }]}>
          {slide.subtitle}
        </Text>
      ) : null}

      <Text style={[styles.body, { color: secondary }]}>{slide.body}</Text>

      {slide.note ? (
        <Text style={[styles.note, { color: secondary }]}>{slide.note}</Text>
      ) : null}
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const router = useRouter();
  const flatRef = useRef<FlatList<SlideData>>(null);
  const currentRef = useRef(0);
  const [current, setCurrent] = useState(0);
  const [listHeight, setListHeight] = useState(0);

  const reduceMotion = useReduceMotion();

  const bg        = isDark ? Colors.dark.background : Colors.background;
  const textColor = isDark ? Colors.dark.text       : Colors.text;
  const secondary = isDark ? Colors.dark.secondary  : '#6C6C70';
  const isLast    = current === SLIDES.length - 1;

  const setPage = useCallback((idx: number) => {
    currentRef.current = idx;
    setCurrent(idx);
  }, []);

  const goNext = useCallback(() => {
    const next = currentRef.current + 1;
    if (next < SLIDES.length) {
      flatRef.current?.scrollToIndex({ index: next, animated: !reduceMotion });
      setPage(next);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [setPage, reduceMotion]);

  const complete = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(tabs)' as any);
  }, [router]);

  const skip = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(tabs)' as any);
  }, [router]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / W);
      if (idx !== currentRef.current) {
        setPage(idx);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [setPage],
  );

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* Slide list */}
      <View
        style={{ flex: 1 }}
        onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
      >
        <FlatList<SlideData>
          ref={flatRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={onMomentumScrollEnd}
          keyExtractor={(item) => item.id}
          getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
          renderItem={({ item }) => (
            <Slide
              slide={item}
              height={listHeight}
              textColor={textColor}
              secondary={secondary}
            />
          )}
          style={{ flex: 1 }}
        />
      </View>

      {/* Skip button — hidden on last screen */}
      {!isLast ? (
        <Pressable
          accessibilityLabel="Skip onboarding"
          accessibilityRole="button"
          accessibilityHint="Skips the introduction and goes straight to the app"
          onPress={skip}
          hitSlop={8}
          style={[styles.skipBtn, { top: insets.top + 16 }]}
        >
          <Text accessible={false} style={[styles.skipText, { color: secondary }]}>Skip</Text>
        </Pressable>
      ) : null}

      {/* Page dots + action button */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        <View
          style={styles.dots}
          accessibilityElementsHidden={true}
          importantForAccessibility="no-hide-descendants"
        >
          {SLIDES.map((_, i) => (
            <Dot key={i} active={i === current} />
          ))}
        </View>
        <Pressable
          accessibilityLabel={isLast ? 'Get started' : `Next, slide ${current + 2} of ${SLIDES.length}`}
          accessibilityRole="button"
          onPress={isLast ? complete : goNext}
          style={styles.nextBtn}
          android_ripple={{ color: 'rgba(255,255,255,0.25)', borderless: false }}
        >
          <Text accessible={false} style={styles.nextText}>{isLast ? 'Get Started' : 'Next'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  slide: {
    width: W,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },

  iconWrap: {
    marginBottom: 32,
  },

  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },

  body: {
    fontSize: 17,
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 16,
  },

  note: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    opacity: 0.75,
  },

  skipBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
  },

  skipText: {
    fontSize: 15,
  },

  bottom: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 20,
  },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },

  dot: {
    height: 8,
    borderRadius: 4,
  },

  nextBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },

  nextText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
