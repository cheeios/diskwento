import React, { useCallback, useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
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
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';

import { Colors } from '@/constants/colors';
import { registerPositiveAction } from '@/lib/rateApp';
import {
  addDocument,
  deleteDocument,
  formatDocumentDate,
  getDocuments,
  StoredDocument,
  DocumentType,
} from '@/lib/storage';
import { RateAppModal } from '@/components/RateAppModal';

// ─── constants ────────────────────────────────────────────────────────────────

const COLS = 3;
const GAP = 2;
const { width: SCREEN_W } = Dimensions.get('window');
const THUMB = (SCREEN_W - GAP * (COLS + 1)) / COLS;

const DOC_DIR = FileSystem.documentDirectory + 'diskwento_docs/';

const META: Record<DocumentType, { title: string; emptyIcon: string; emptyLabel: string; accentColor: string }> = {
  'reseta': {
    title: 'My Reseta',
    emptyIcon: 'doc.text',
    emptyLabel: 'No prescriptions saved yet.\nTap + to add one.',
    accentColor: Colors.accent,
  },
  'pwd-id': {
    title: 'PWD ID',
    emptyIcon: 'person.crop.rectangle',
    emptyLabel: 'No PWD ID saved yet.\nTap + to add one.',
    accentColor: Colors.pwd,
  },
  'senior-id': {
    title: 'Senior Citizen ID',
    emptyIcon: 'person.crop.rectangle',
    emptyLabel: 'No Senior ID saved yet.\nTap + to add one.',
    accentColor: Colors.senior,
  },
};

// ─── icon helper ─────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, string> = {
  'doc.text': 'document-text-outline',
  'person.crop.rectangle': 'card-outline',
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

export default function DocumentVaultScreen() {
  const insets = useSafeAreaInsets();
  const { type } = useLocalSearchParams<{ type: DocumentType }>();
  const isDark = useColorScheme() === 'dark';

  const bg       = isDark ? Colors.dark.background : Colors.background;
  const text     = isDark ? Colors.dark.text       : Colors.text;
  const card     = isDark ? Colors.dark.card       : Colors.surface;
  const secondary = isDark ? Colors.dark.secondary : Colors.textSecondary;

  const meta = META[type] ?? META['reseta'];

  const [docs, setDocs] = useState<StoredDocument[]>([]);
  const [viewer, setViewer] = useState<StoredDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [rateModalVisible, setRateModalVisible] = useState(false);

  // zoom / pan state for the fullscreen viewer
  const scale       = useSharedValue(1);
  const savedScale  = useSharedValue(1);
  const tx          = useSharedValue(0);
  const ty          = useSharedValue(0);
  const savedTx     = useSharedValue(0);
  const savedTy     = useSharedValue(0);

  function openViewer(doc: StoredDocument) {
    scale.value = 1; savedScale.value = 1;
    tx.value = 0;    savedTx.value = 0;
    ty.value = 0;    savedTy.value = 0;
    setViewer(doc);
  }

  function closeViewer() {
    scale.value = 1; savedScale.value = 1;
    tx.value = 0;    savedTx.value = 0;
    ty.value = 0;    savedTy.value = 0;
    setViewer(null);
  }

  const pinch = Gesture.Pinch()
    .onUpdate(e => {
      'worklet';
      scale.value = Math.max(1, Math.min(savedScale.value * e.scale, 6));
    })
    .onEnd(() => {
      'worklet';
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate(e => {
      'worklet';
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
    })
    .onEnd(() => {
      'worklet';
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(200)
    .onEnd(() => {
      'worklet';
      scale.value      = withSpring(1);
      savedScale.value = 1;
      tx.value         = withSpring(0);
      ty.value         = withSpring(0);
      savedTx.value    = 0;
      savedTy.value    = 0;
    });

  const zoomGesture = Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, pan));

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  const docDir = DOC_DIR + type + '/';

  useEffect(() => {
    loadDocs();
  }, [type]);

  async function loadDocs() {
    setDocs(await getDocuments(type));
  }

  async function ensureDir() {
    const info = await FileSystem.getInfoAsync(docDir);
    if (!info.exists) await FileSystem.makeDirectoryAsync(docDir, { intermediates: true });
  }

  async function saveImageToVault(sourceUri: string): Promise<string> {
    await ensureDir();
    const ext = sourceUri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const dest = docDir + Date.now() + '.' + ext;
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
    return dest;
  }

  async function handleAdd() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        async (idx) => {
          if (idx === 1) await pickImage('camera');
          if (idx === 2) await pickImage('library');
        },
      );
    } else {
      Alert.alert('Add ' + meta.title, undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => pickImage('camera') },
        { text: 'Choose from Library', onPress: () => pickImage('library') },
      ]);
    }
  }

  async function pickImage(source: 'camera' | 'library') {
    try {
      let result: ImagePicker.ImagePickerResult;
      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
      };

      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Camera access needed', 'Please enable camera access in Settings.');
          return;
        }
        result = await ImagePicker.launchCameraAsync(opts);
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Photos access needed', 'Please enable photo library access in Settings.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(opts);
      }

      if (result.canceled || !result.assets[0]) return;

      setLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const permanentUri = await saveImageToVault(result.assets[0].uri);
      await addDocument(type, permanentUri);
      await loadDocs();
      if (await registerPositiveAction()) setRateModalVisible(true);
    } catch (e) {
      Alert.alert('Error', 'Could not save image. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(doc: StoredDocument) {
    Alert.alert(
      'Delete this image?',
      'This cannot be undone.',
      [
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
            if (viewer?.id === doc.id) closeViewer();
            await loadDocs();
          },
        },
      ],
    );
  }

  const renderThumb = useCallback(
    ({ item, index }: { item: StoredDocument; index: number }) => (
      <Pressable
        accessibilityLabel={`Photo ${index + 1}, added ${formatDocumentDate(item.dateAdded)}`}
        accessibilityRole="button"
        accessibilityHint="Tap to view full screen. Long press to delete."
        style={({ pressed }) => [styles.thumb, pressed && { opacity: 0.75 }]}
        onPress={() => openViewer(item)}
        onLongPress={() => handleDelete(item)}
        delayLongPress={500}
      >
        <Image accessible={false} source={{ uri: item.uri }} style={styles.thumbImg} contentFit="cover" />
      </Pressable>
    ),
    [docs],
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: meta.title,
          headerBackTitle: 'Home',
          headerStyle: { backgroundColor: bg },
          headerTintColor: meta.accentColor,
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable
              accessibilityLabel={`Add ${meta.title}`}
              accessibilityRole="button"
              accessibilityHint="Opens camera or photo library"
              accessibilityState={{ disabled: loading }}
              onPress={handleAdd}
              hitSlop={8}
              style={({ pressed }) => [
                { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
                pressed && { opacity: 0.5 },
              ]}
              disabled={loading}
            >
              <Sym name="photo.badge.plus" size={22} color={loading ? Colors.placeholder : meta.accentColor} />
            </Pressable>
          ),
        }}
      />

      <View style={[styles.root, { backgroundColor: bg }]}>
        {docs.length === 0 ? (
          <View style={styles.empty}>
            <View accessible={false} style={[styles.emptyIcon, { backgroundColor: isDark ? Colors.dark.card : Colors.surface }]}>
              <Sym name={meta.emptyIcon} size={36} color={meta.accentColor} />
            </View>
            <Text style={[styles.emptyText, { color: secondary }]}>{meta.emptyLabel}</Text>
          </View>
        ) : (
          <FlatList
            data={docs}
            keyExtractor={d => d.id}
            renderItem={renderThumb}
            numColumns={COLS}
            contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 16 }]}
            ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
            columnWrapperStyle={{ gap: GAP }}
          />
        )}
      </View>

      {/* ── Fullscreen viewer ── */}
      <Modal
        visible={!!viewer}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeViewer}
        accessibilityViewIsModal={true}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.viewerRoot}>
          <GestureDetector gesture={zoomGesture}>
            <Animated.View style={[styles.viewerImg, zoomStyle]}>
              <Image
                accessible={false}
                source={{ uri: viewer?.uri }}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
              />
            </Animated.View>
          </GestureDetector>

          {/* Top bar — sits above the gesture area */}
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
              {viewer ? formatDocumentDate(viewer.dateAdded) : ''}
            </Text>
            <Pressable
              accessibilityLabel="Delete this photo"
              accessibilityRole="button"
              accessibilityHint="Permanently removes this image"
              onPress={() => viewer && handleDelete(viewer)}
              hitSlop={12}
              style={({ pressed }) => [styles.viewerBtn, pressed && { opacity: 0.6 }]}
            >
              <Sym name="trash" size={20} color={Colors.danger} />
            </Pressable>
          </View>
        </View>
        </GestureHandlerRootView>
      </Modal>

      <RateAppModal visible={rateModalVisible} onClose={() => setRateModalVisible(false)} />
    </>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  grid: {
    paddingTop: GAP,
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

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
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
