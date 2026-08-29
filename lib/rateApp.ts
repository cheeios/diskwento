import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';

import { ANDROID_PACKAGE_NAME, IOS_APP_STORE_ID } from '@/constants/config';

type Status = 'rated' | 'declined';

const STATUS_KEY     = 'diskwento_rate_status';
const COUNT_KEY       = 'diskwento_rate_action_count';
const LAST_SHOWN_KEY  = 'diskwento_rate_last_shown';

const TRIGGER_AFTER = 3;                       // earliest ask: 3rd positive action
const SHOW_CHANCE = 0.6;                       // don't ask every single eligible time
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;  // re-roll at most every 14 days

/**
 * Call after a moment of delivered value (e.g. a successfully saved,
 * non-overcharged transaction). Returns true if the rate prompt should
 * be shown right now.
 */
export async function registerPositiveAction(): Promise<boolean> {
  try {
    const status = await AsyncStorage.getItem(STATUS_KEY);
    if (status === 'rated' || status === 'declined') return false;

    const countRaw = await AsyncStorage.getItem(COUNT_KEY);
    const count = (countRaw ? parseInt(countRaw, 10) : 0) + 1;

    if (count < TRIGGER_AFTER) {
      await AsyncStorage.setItem(COUNT_KEY, count.toString());
      return false;
    }

    const lastShownRaw = await AsyncStorage.getItem(LAST_SHOWN_KEY);
    const lastShown = lastShownRaw ? parseInt(lastShownRaw, 10) : 0;
    if (Date.now() - lastShown < COOLDOWN_MS) {
      await AsyncStorage.setItem(COUNT_KEY, count.toString());
      return false;
    }

    if (Math.random() > SHOW_CHANCE) {
      // Not this time — keep counting so we try again on the next action.
      await AsyncStorage.setItem(COUNT_KEY, count.toString());
      return false;
    }

    await AsyncStorage.setItem(COUNT_KEY, '0');
    await AsyncStorage.setItem(LAST_SHOWN_KEY, Date.now().toString());
    return true;
  } catch {
    return false;
  }
}

export async function markRateStatus(status: Status): Promise<void> {
  try {
    await AsyncStorage.setItem(STATUS_KEY, status);
  } catch {
    // non-critical
  }
}

export function openStoreForRating(): void {
  const primary = Platform.select({
    ios: `itms-apps://apps.apple.com/app/id${IOS_APP_STORE_ID}?action=write-review`,
    // reviewId=0 is an undocumented but widely-used trick to land Play Store
    // straight on the star-rating prompt instead of the plain listing page.
    android: `market://details?id=${ANDROID_PACKAGE_NAME}&reviewId=0`,
  });
  const fallback = Platform.select({
    ios: `https://apps.apple.com/app/id${IOS_APP_STORE_ID}?action=write-review`,
    android: `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}`,
  });

  if (!primary || !fallback) return;
  Linking.openURL(primary).catch(() => Linking.openURL(fallback));
}
