import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
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

export const WHATS_NEW_KEY     = 'diskwento_whats_new_seen';
export const WHATS_NEW_VERSION = '1.1.0';

const { width: W } = Dimensions.get('window');

type SlideData = {
  id: string;
  title: string;
  body: string;
  note?: string;
  icon: string;
  iconColor: string;
};

const SLIDES: SlideData[] = [
  {
    id: 'vault',
    icon: 'cross.case.fill',
    iconColor: Colors.accent,
    title: 'Reseta & ID Vault',
    body: 'Store your prescriptions and discount IDs as photos — kept privately on your device. No cloud, no accounts.',
    note: 'Tap a photo to view it full screen. Pinch to zoom in.',
  },
  {
    id: 'history',
    icon: 'clock.arrow.circlepath',
    iconColor: Colors.senior,
    title: 'Transaction History',
    body: 'Every discount check and VAT calculation you save is stored in one place, organized by date.',
    note: 'Swipe left on any entry to delete it.',
  },
  {
    id: 'accessibility',
    icon: 'accessibility',
    iconColor: Colors.pwd,
    title: 'Built for Everyone',
    body: 'Full VoiceOver and TalkBack support, Reduce Motion, and improved font scaling — so Diskwento works for users of all abilities.',
    note: 'Compatible with iOS VoiceOver and Android TalkBack.',
  },
];

const SF_ICON_MAP: Record<string, string> = {
  'cross.case.fill':       'medkit',
  'clock.arrow.circlepath': 'time',
  'accessibility':          'accessibility',
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
        <SlideSymbol name={slide.icon} size={64} color={slide.iconColor} />
      </View>
      <Text accessibilityRole="header" style={[styles.title, { color: textColor }]}>
        {slide.title}
      </Text>
      <Text style={[styles.body, { color: secondary }]}>{slide.body}</Text>
      {slide.note ? (
        <Text style={[styles.note, { color: secondary }]}>{slide.note}</Text>
      ) : null}
    </View>
  );
}

export default function WhatsNewScreen() {
  const insets      = useSafeAreaInsets();
  const isDark      = useColorScheme() === 'dark';
  const router      = useRouter();
  const flatRef     = useRef<FlatList<SlideData>>(null);
  const currentRef  = useRef(0);
  const [current, setCurrent]       = useState(0);
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
    await AsyncStorage.setItem(WHATS_NEW_KEY, WHATS_NEW_VERSION);
    router.replace('/(tabs)' as any);
  }, [router]);

  const skip = useCallback(async () => {
    await AsyncStorage.setItem(WHATS_NEW_KEY, WHATS_NEW_VERSION);
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
      {/* Slide label */}
      <Text
        accessible={false}
        style={[styles.eyebrow, { color: Colors.accent, top: insets.top + 20 }]}
        allowFontScaling={false}
      >
        What's New in {WHATS_NEW_VERSION}
      </Text>

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

      {/* Skip button */}
      {!isLast ? (
        <Pressable
          accessibilityLabel="Skip"
          accessibilityRole="button"
          accessibilityHint="Skips what's new and goes straight to the app"
          onPress={skip}
          hitSlop={8}
          style={[styles.skipBtn, { top: insets.top + 16 }]}
        >
          <Text accessible={false} style={[styles.skipText, { color: secondary }]}>Skip</Text>
        </Pressable>
      ) : null}

      {/* Dots + button */}
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
          accessibilityLabel={isLast ? 'Got it' : `Next, slide ${current + 2} of ${SLIDES.length}`}
          accessibilityRole="button"
          onPress={isLast ? complete : goNext}
          style={styles.nextBtn}
          android_ripple={{ color: 'rgba(255,255,255,0.25)', borderless: false }}
        >
          <Text accessible={false} style={styles.nextText}>
            {isLast ? 'Got it!' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  eyebrow: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    zIndex: 10,
  },

  slide: {
    width: W,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
    paddingTop: 48,
  },

  iconWrap: {
    marginBottom: 32,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
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
