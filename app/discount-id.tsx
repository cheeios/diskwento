import React, { useCallback, useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { SymbolView } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import {
  addDocument,
  deleteDocument,
  formatDocumentDate,
  getDocuments,
  StoredDocument,
  DocumentType,
} from '@/lib/storage';

// ─── constants ────────────────────────────────────────────────────────────────

const COLS = 3;
const GAP = 2;
const { width: SCREEN_W } = Dimensions.get('window');
const THUMB = (SCREEN_W - GAP * (COLS + 1)) / COLS;
const DOC_DIR = FileSystem.documentDirectory + 'diskwento_docs/';

const SECTIONS: { type: DocumentType; label: string; color: string; emptyText: string }[] = [
  {
    type: 'pwd-id',
    label: 'PWD ID',
    color: Colors.pwd,
    emptyText: 'No PWD ID saved yet.',
  },
  {
    type: 'senior-id',
    label: 'Senior Citizen ID',
    color: Colors.senior,
    emptyText: 'No Senior ID saved yet.',
  },
];

// ─── icon helper ─────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, string> = {
  'photo.badge.plus': 'image-outline',
  'trash': 'trash-outline',
  'xmark': 'close',
};

function Sym({ name, size, color }: { name: string; size: number; color: string }) {
  if (Platform.OS === 'ios') {
    return <SymbolView name={name as any} size={size} tintColor={color} />;
  }
  return <Ionicons name={(ICON_MAP[name] || 'help-circle') as any} size={size} color={color} />;
}

// ─── screen ───────────────────────────────────────────────────────────────────

type ViewerState = { doc: StoredDocument; type: DocumentType } | null;

export default function DiscountIdScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';

  const bg       = isDark ? Colors.dark.background : Colors.background;
  const text     = isDark ? Colors.dark.text       : Colors.text;
  const card     = isDark ? Colors.dark.card       : Colors.surface;
  const secondary = isDark ? Colors.dark.secondary : Colors.textSecondary;
  const sep      = isDark ? Colors.dark.separator  : Colors.separatorOpaque;

  const [docs, setDocs] = useState<Record<DocumentType, StoredDocument[]>>({
    'reseta': [],
    'pwd-id': [],
    'senior-id': [],
  });
  const [viewer, setViewer] = useState<ViewerState>(null);
  const [loading, setLoading] = useState<DocumentType | null>(null);

  // zoom shared values
  const scale      = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx         = useSharedValue(0);
  const ty         = useSharedValue(0);
  const savedTx    = useSharedValue(0);
  const savedTy    = useSharedValue(0);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const [pwd, senior] = await Promise.all([
      getDocuments('pwd-id'),
      getDocuments('senior-id'),
    ]);
    setDocs(prev => ({ ...prev, 'pwd-id': pwd, 'senior-id': senior }));
  }

  async function loadSection(type: DocumentType) {
    const items = await getDocuments(type);
    setDocs(prev => ({ ...prev, [type]: items }));
  }

  function openViewer(doc: StoredDocument, type: DocumentType) {
    scale.value = 1; savedScale.value = 1;
    tx.value = 0;    savedTx.value = 0;
    ty.value = 0;    savedTy.value = 0;
    setViewer({ doc, type });
  }

  function closeViewer() {
    scale.value = 1; savedScale.value = 1;
    tx.value = 0;    savedTx.value = 0;
    ty.value = 0;    savedTy.value = 0;
    setViewer(null);
  }

  const pinch = Gesture.Pinch()
    .onUpdate(e => { 'worklet'; scale.value = Math.max(1, Math.min(savedScale.value * e.scale, 6)); })
    .onEnd(() => { 'worklet'; savedScale.value = scale.value; });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate(e => { 'worklet'; tx.value = savedTx.value + e.translationX; ty.value = savedTy.value + e.translationY; })
    .onEnd(() => { 'worklet'; savedTx.value = tx.value; savedTy.value = ty.value; });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(200)
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1); savedScale.value = 1;
      tx.value = withSpring(0);    savedTx.value = 0;
      ty.value = withSpring(0);    savedTy.value = 0;
    });

  const zoomGesture = Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, pan));
  const zoomStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  async function ensureDir(type: DocumentType) {
    const dir = DOC_DIR + type + '/';
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    return dir;
  }

  async function handleAdd(type: DocumentType, label: string) {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take Photo', 'Choose from Library'], cancelButtonIndex: 0 },
        async (idx) => {
          if (idx === 1) await pickImage(type, 'camera');
          if (idx === 2) await pickImage(type, 'library');
        },
      );
    } else {
      Alert.alert('Add ' + label, undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => pickImage(type, 'camera') },
        { text: 'Choose from Library', onPress: () => pickImage(type, 'library') },
      ]);
    }
  }

  async function pickImage(type: DocumentType, source: 'camera' | 'library') {
    try {
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.85 };
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('Camera access needed', 'Please enable camera access in Settings.'); return; }
        result = await ImagePicker.launchCameraAsync(opts);
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Photos access needed', 'Please enable photo library access in Settings.'); return; }
        result = await ImagePicker.launchImageLibraryAsync(opts);
      }

      if (result.canceled || !result.assets[0]) return;

      setLoading(type);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const dir = await ensureDir(type);
      const ext = result.assets[0].uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const dest = dir + Date.now() + '.' + ext;
      await FileSystem.copyAsync({ from: result.assets[0].uri, to: dest });
      await addDocument(type, dest);
      await loadSection(type);
    } catch {
      Alert.alert('Error', 'Could not save image. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete(doc: StoredDocument, type: DocumentType) {
    Alert.alert('Delete this image?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const uri = await deleteDocument(type, doc.id);
          if (uri) {
            const info = await FileSystem.getInfoAsync(uri);
            if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
          }
          if (viewer?.doc.id === doc.id) closeViewer();
          await loadSection(type);
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Discount ID',
          headerBackTitle: 'Home',
          headerStyle: { backgroundColor: bg },
          headerTintColor: Colors.accent,
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: bg }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map((section, si) => (
          <View key={section.type}>
            {/* Section header */}
            <View style={[styles.sectionHeader, si === 0 && { marginTop: 24 }]}>
              <View accessible={false} style={[styles.sectionDot, { backgroundColor: section.color }]} />
              <Text accessibilityRole="header" style={[styles.sectionTitle, { color: text }]}>{section.label}</Text>
              <Pressable
                accessibilityLabel={`Add ${section.label} photo`}
                accessibilityRole="button"
                accessibilityHint="Opens camera or photo library"
                accessibilityState={{ disabled: loading === section.type }}
                onPress={() => handleAdd(section.type, section.label)}
                hitSlop={8}
                disabled={loading === section.type}
                style={({ pressed }) => [
                  styles.addBtn,
                  { backgroundColor: section.color + '1A' },
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Sym
                  name="photo.badge.plus"
                  size={18}
                  color={loading === section.type ? Colors.placeholder : section.color}
                />
              </Pressable>
            </View>

            {/* Grid or empty state */}
            {docs[section.type].length === 0 ? (
              <View style={[styles.emptyRow, { backgroundColor: card }]}>
                <Text style={[styles.emptyText, { color: secondary }]}>{section.emptyText}</Text>
                <Text style={[styles.emptyHint, { color: Colors.placeholder }]}>Tap the icon above to add one.</Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {docs[section.type].map((doc, idx) => (
                  <Pressable
                    key={doc.id}
                    accessibilityLabel={`${section.label} photo ${idx + 1}, added ${formatDocumentDate(doc.dateAdded)}`}
                    accessibilityRole="button"
                    accessibilityHint="Tap to view full screen. Long press to delete."
                    style={({ pressed }) => [styles.thumb, pressed && { opacity: 0.75 }]}
                    onPress={() => openViewer(doc, section.type)}
                    onLongPress={() => handleDelete(doc, section.type)}
                    delayLongPress={500}
                  >
                    <Image accessible={false} source={{ uri: doc.uri }} style={styles.thumbImg} contentFit="cover" />
                  </Pressable>
                ))}
              </View>
            )}

            {si < SECTIONS.length - 1 && (
              <View style={[styles.sectionSep, { backgroundColor: sep }]} />
            )}
          </View>
        ))}
      </ScrollView>

      {/* ── Fullscreen viewer ── */}
      <Modal visible={!!viewer} animationType="fade" statusBarTranslucent onRequestClose={closeViewer} accessibilityViewIsModal={true}>
        <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.viewerRoot}>
          <GestureDetector gesture={zoomGesture}>
            <Animated.View style={[styles.viewerImg, zoomStyle]}>
              <Image
                accessible={false}
                source={{ uri: viewer?.doc.uri }}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
              />
            </Animated.View>
          </GestureDetector>

          <View style={[styles.viewerTopBar, { paddingTop: insets.top + 8 }]}>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              onPress={closeViewer}
              hitSlop={12}
              style={({ pressed }) => [styles.viewerBtn, pressed && { opacity: 0.6 }]}
            >
              <Sym name="xmark" size={20} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.viewerDate} numberOfLines={1}>
              {viewer ? formatDocumentDate(viewer.doc.dateAdded) : ''}
            </Text>
            <Pressable
              accessibilityLabel="Delete this photo"
              accessibilityRole="button"
              accessibilityHint="Permanently removes this image"
              onPress={() => viewer && handleDelete(viewer.doc, viewer.type)}
              hitSlop={12}
              style={({ pressed }) => [styles.viewerBtn, pressed && { opacity: 0.6 }]}
            >
              <Sym name="trash" size={20} color={Colors.danger} />
            </Pressable>
          </View>
        </View>
        </GestureHandlerRootView>
      </Modal>
    </>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 28,
    gap: 8,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyRow: {
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
  },
  emptyHint: {
    fontSize: 13,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    paddingHorizontal: GAP,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: Colors.separatorOpaque,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },

  sectionSep: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginTop: 24,
  },

  viewerRoot: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImg: {
    width: '100%',
    height: '100%',
  },
  viewerTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  viewerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerDate: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontWeight: '500',
  },
});
