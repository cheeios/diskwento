import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';

// ─── types ───────────────────────────────────────────────────────────────────

type LocationData = {
  addressLine1: string;
  addressLine2: string;
  lat: number;
  lng: number;
  timestamp: Date;
};

type Phase = 'camera' | 'capturing' | 'preview';

export type GPSCameraProps = {
  visible: boolean;
  defaultGPS?: boolean;
  onCapture: (uri: string) => void;
  onClose: () => void;
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatTimestamp(date: Date): string {
  const weekday = date.toLocaleDateString('en', { weekday: 'long' });
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${weekday}, ${dd}/${mm}/${yyyy} · ${hh}:${min} GMT+08:00`;
}

async function resolveLocation(): Promise<LocationData | null> {
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const [geo] = await Location.reverseGeocodeAsync({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    });
    const line1 = [geo?.street, geo?.district ?? geo?.subregion, geo?.city]
      .filter(Boolean)
      .join(', ');
    const line2 = [geo?.region, geo?.country].filter(Boolean).join(', ');
    return {
      addressLine1: line1 || 'Unknown location',
      addressLine2: line2,
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      timestamp: new Date(),
    };
  } catch {
    return null;
  }
}

// ─── component ───────────────────────────────────────────────────────────────

export function GPSCamera({ visible, defaultGPS = true, onCapture, onClose }: GPSCameraProps) {
  const insets = useSafeAreaInsets();
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [gpsEnabled, setGpsEnabled] = useState(defaultGPS);
  const [phase, setPhase] = useState<Phase>('camera');
  const [rawPhotoUri, setRawPhotoUri] = useState<string | null>(null);
  const [locationData, setLocationData] = useState<LocationData | null>(null);

  const cameraRef = useRef<CameraView>(null);
  const compositeRef = useRef<View>(null);

  useEffect(() => {
    if (visible) {
      setPhase('camera');
      setRawPhotoUri(null);
      setLocationData(null);
      setGpsEnabled(defaultGPS);
    }
  }, [visible, defaultGPS]);

  const camDenied = camPermission !== null && !camPermission.granted && !camPermission.canAskAgain;

  async function handleCapture() {
    if (phase !== 'camera') return;

    if (!camPermission?.granted) {
      const result = await requestCamPermission();
      if (!result.granted) return;
    }

    // Check location permission before taking photo
    let effectiveGPS = gpsEnabled;
    if (gpsEnabled) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        let continueWithoutGPS = false;
        await new Promise<void>(resolve => {
          Alert.alert(
            'Location Access Needed',
            'Enable location in Settings to geotag your photo, or turn off the GPS toggle to take a photo without location.',
            [
              {
                text: 'Open Settings',
                onPress: () => { Linking.openSettings(); resolve(); },
              },
              {
                text: 'Continue without GPS',
                onPress: () => { continueWithoutGPS = true; setGpsEnabled(false); resolve(); },
              },
            ],
          );
        });
        if (!continueWithoutGPS) return;
        effectiveGPS = false;
      }
    }

    setPhase('capturing');

    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85 });
      if (!photo) {
        setPhase('camera');
        return;
      }

      setRawPhotoUri(photo.uri);

      if (effectiveGPS) {
        const loc = await resolveLocation();
        setLocationData(loc);
      }

      setPhase('preview');
    } catch {
      setPhase('camera');
    }
  }

  async function handleUsePhoto() {
    try {
      const uri = await captureRef(compositeRef as React.RefObject<React.Component>, {
        format: 'jpg',
        quality: 0.9,
      });
      const newFilename = `Diskwento_${Date.now()}.jpg`;
      const newPath = `${FileSystem.documentDirectory}${newFilename}`;
      await FileSystem.copyAsync({ from: uri, to: newPath });
      onCapture(newPath);
    } catch {
      if (rawPhotoUri) onCapture(rawPhotoUri);
    }
    handleClose();
  }

  function handleRetake() {
    setPhase('camera');
    setRawPhotoUri(null);
    setLocationData(null);
  }

  function handleClose() {
    setPhase('camera');
    setRawPhotoUri(null);
    setLocationData(null);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.root}>

        {phase !== 'preview' ? (
          // ── CAMERA PHASE ────────────────────────────────────────
          camDenied ? (
            // ── PERMISSION DENIED SCREEN ────────────────────────
            <View style={[styles.permissionView, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
              <Ionicons name="camera-outline" size={56} color={Colors.placeholder} />
              <Text style={styles.permissionTitle} allowFontScaling={true}>
                Camera Access Required
              </Text>
              <Text style={styles.permissionBody} allowFontScaling={true}>
                Diskwento needs camera access to photograph your receipt as evidence. Please enable it in Settings.
              </Text>
              <Pressable
                onPress={() => Linking.openSettings()}
                style={styles.permissionButton}
              >
                <Text style={styles.permissionButtonText} allowFontScaling={false}>Open Settings</Text>
              </Pressable>
              <Pressable onPress={handleClose} style={styles.permissionCancel}>
                <Text style={styles.permissionCancelText} allowFontScaling={false}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing="back"
              />

              {/* Top bar */}
              <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
                <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={12}>
                  <Ionicons name="close" size={24} color="#fff" />
                </Pressable>
                <View style={styles.gpsToggleGroup}>
                  <Text style={styles.gpsLabel} allowFontScaling={false}>GPS Overlay</Text>
                  <Switch
                    value={gpsEnabled}
                    onValueChange={setGpsEnabled}
                    trackColor={{ true: Colors.danger, false: 'rgba(255,255,255,0.25)' }}
                    thumbColor="#fff"
                    ios_backgroundColor="rgba(255,255,255,0.25)"
                  />
                </View>
              </View>

              {/* Bottom bar */}
              <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 28 }]}>
                <Pressable
                  onPress={handleCapture}
                  disabled={phase === 'capturing'}
                  style={[styles.shutterBtn, phase === 'capturing' && { opacity: 0.5 }]}
                  hitSlop={8}
                >
                  <View style={styles.shutterOuter}>
                    <View style={styles.shutterInner} />
                  </View>
                </Pressable>
              </View>
            </>
          )
        ) : (
          // ── PREVIEW PHASE ────────────────────────────────────────
          <>
            {/* Composite view — ref is captured, no controls inside */}
            <View
              ref={compositeRef}
              collapsable={false}
              style={styles.compositeView}
            >
              {rawPhotoUri ? (
                <Image
                  source={{ uri: rawPhotoUri }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
              ) : null}
              {gpsEnabled && locationData ? (
                <GPSOverlay data={locationData} />
              ) : null}
            </View>

            {/* Controls — outside compositeRef, not burned into image */}
            <View style={[styles.previewBar, { paddingBottom: insets.bottom + 16 }]}>
              <Pressable onPress={handleRetake} style={styles.retakeBtn} hitSlop={8}>
                <Text style={styles.retakeBtnText} allowFontScaling={false}>Retake</Text>
              </Pressable>
              <Pressable onPress={handleUsePhoto} style={styles.useBtn}>
                <Text style={styles.useBtnText} allowFontScaling={false}>Use Photo</Text>
              </Pressable>
            </View>
          </>
        )}

      </View>
    </Modal>
  );
}

// ─── GPS overlay bar ─────────────────────────────────────────────────────────

function GPSOverlay({ data }: { data: LocationData }) {
  return (
    <View style={overlay.bar}>
      <Text style={overlay.addressPrimary} allowFontScaling={false}>{'📍 '}{data.addressLine1}</Text>
      {data.addressLine2 ? (
        <Text style={overlay.line} allowFontScaling={false}>{'     '}{data.addressLine2}</Text>
      ) : null}
      <Text style={overlay.small} allowFontScaling={false}>
        {'     '}{'Lat ' + data.lat.toFixed(4) + ' · Long ' + data.lng.toFixed(4)}
      </Text>
      <Text style={overlay.small} allowFontScaling={false}>{'     '}{formatTimestamp(data.timestamp)}</Text>
      <View style={overlay.brandingRow}>
        <Image
          source={require('../assets/images/icon.png')}
          style={{ width: 16, height: 16, borderRadius: 3 }}
        />
        <Text style={overlay.branding} allowFontScaling={false}>Diskwento Mobile App PH</Text>
      </View>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  // ── Permission denied screen ──────────────────────────────────────────────
  permissionView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginTop: 8,
  },
  permissionBody: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionButton: {
    marginTop: 8,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    minWidth: 200,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  permissionCancel: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  permissionCancelText: {
    color: 'rgba(255,255,255,0.60)',
    fontSize: 16,
    fontWeight: '500',
  },

  // ── Camera phase ──────────────────────────────────────────────────────────
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.40)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsToggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.40)',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  gpsLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 20,
  },
  shutterBtn: { alignItems: 'center', justifyContent: 'center' },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
  },

  // ── Preview phase ─────────────────────────────────────────────────────────
  compositeView: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: '#000',
    gap: 12,
  },
  retakeBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  retakeBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '500',
  },
  useBtn: {
    flex: 1,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});

const overlay = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  addressPrimary: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  line: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 18,
  },
  small: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    lineHeight: 18,
  },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  branding: {
    color: '#fff',
    fontSize: 11,
    lineHeight: 18,
  },
});
