import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as MailComposer from 'expo-mail-composer';
import { SymbolView } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import { WEBHOOK_URL, REPORT_CC_EMAIL } from '@/constants/config';
import { GPSCamera } from '@/components/GPSCamera';
import { LGUContact, METRO_MANILA_LGUS } from '@/constants/lguContacts';
import { getTransactions, saveTransaction, updateTransaction } from '@/lib/storage';

// ─── icon helper ─────────────────────────────────────────────────────────────

const SF_MAP: Record<string, string> = {
  'camera.fill':                 'camera',
  'chevron.right':               'chevron-forward',
  'checkmark':                   'checkmark',
  'xmark':                       'close',
  'checkmark.circle.fill':       'checkmark-circle',
  'exclamationmark.triangle.fill': 'warning',
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

const TODAY = new Date().toLocaleDateString('en-PH', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

async function fireWebhook(
  city: string,
  establishmentName: string,
  discountType: string,
  overchargedBy: number,
  reportedTo: string[],
  reportType: 'complaint' | 'concern',
): Promise<string | null> {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city,
        establishmentName,
        discountType,
        overchargedBy,
        reportedTo,
        reportType,
        appVersion: '1.1.0',
      }),
    });
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return data?.reportId || null;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isDark    = useColorScheme() === 'dark';
  const bg        = isDark ? Colors.dark.background : Colors.background;
  const card      = isDark ? Colors.dark.card       : Colors.surface;
  const text      = isDark ? Colors.dark.text       : Colors.text;
  const secondary = isDark ? Colors.dark.secondary  : Colors.textSecondary;

  const {
    transactionName,
    discountType: dtParam,
    originalTotal: otStr,
    vatDeducted: vdStr,
    discountAmount: daStr,
    computedTotal: ctStr,
    establishmentCharged: ecStr,
    discrepancy: dStr,
  } = useLocalSearchParams<{
    transactionName?: string;
    discountType?: string;
    originalTotal?: string;
    vatDeducted?: string;
    discountAmount?: string;
    computedTotal?: string;
    establishmentCharged?: string;
    discrepancy?: string;
  }>();

  const isPWD                = dtParam !== 'senior';
  const discountTypeLabel    = dtParam === 'senior' ? 'Senior Citizen' : 'PWD';
  const originalTotal        = parseFloat(otStr ?? '0');
  const vatDeducted          = parseFloat(vdStr ?? '0');
  const discountAmount       = parseFloat(daStr ?? '0');
  const computedTotal        = parseFloat(ctStr ?? '0');
  const establishmentCharged = parseFloat(ecStr ?? '0');
  const discrepancy          = parseFloat(dStr ?? '0');

  // Mode — null until user picks; null = show picker modal
  const [reportMode, setReportMode] = useState<'complaint' | 'concern' | null>(null);

  // Evidence
  const [receiptPhotoUri, setReceiptPhotoUri] = useState<string | null>(null);
  const [itemPhotoUri, setItemPhotoUri]       = useState<string | null>(null);
  const [receiptCameraOpen, setReceiptCameraOpen] = useState(false);
  const [itemCameraOpen, setItemCameraOpen]   = useState(false);

  // Details
  const [businessName, setBusinessName]       = useState(transactionName || '');
  const [businessAddress, setBusinessAddress] = useState('');

  // LGU city
  const [selectedCity, setSelectedCity] = useState<LGUContact | null>(null);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [sendLGU, setSendLGU]           = useState(false);

  // Recipients
  const [sendDTI, setSendDTI]   = useState(true);
  const [sendNCDA, setSendNCDA] = useState(true);
  const canSend = sendDTI || sendNCDA || (sendLGU && !!selectedCity);

  async function handleSend() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const recipients: string[] = [];
    if (sendDTI) recipients.push('dti.fo-ncr@dti.gov.ph');
    if (sendNCDA) recipients.push('info@ncda.gov.ph');
    if (sendLGU && selectedCity) {
      const officeEmail = isPWD ? selectedCity.pdao.email : selectedCity.osca.email;
      if (officeEmail) recipients.push(officeEmail);
    }

    const selectedRecipients: string[] = [];
    if (sendDTI) selectedRecipients.push('DTI');
    if (sendNCDA) selectedRecipients.push('NCDA');
    if (sendLGU && selectedCity) selectedRecipients.push(`${isPWD ? 'PDAO' : 'OSCA'} - ${selectedCity.city}`);

    const webhookPromise = fireWebhook(
      selectedCity?.city || 'Not specified',
      businessName || 'Unknown',
      dtParam || 'pwd',
      discrepancy,
      selectedRecipients,
      reportMode ?? 'complaint',
    );

    const isComplaint = reportMode === 'complaint';

    const subject = isComplaint
      ? `Complaint: Improper ${discountTypeLabel} Discount at ${businessName || 'Establishment'} — ${TODAY}`
      : `Concern: Possible Discount Discrepancy at ${businessName || 'Establishment'} — ${TODAY}`;

    let lguSection = '';
    if (selectedCity) {
      const c = isPWD ? selectedCity.pdao : selectedCity.osca;
      const officeAcronym = isPWD ? 'PDAO' : 'OSCA';
      const officeName = isPWD ? 'Persons with Disability Affairs Office' : 'Office for Senior Citizens Affairs';
      lguSection = `\nLOCAL ${officeAcronym} CONTACT (Local Government Unit):
${selectedCity.city} ${officeAcronym} — ${officeName}
Email: ${c.email ?? 'Not available'}
Phone: ${c.phone ?? 'Not available'}
Address: ${c.address ?? 'Not available'}
Facebook: ${c.facebook ?? 'Not available'}
Note: Please verify contact details with your local city hall as information may have changed.`;
    }

    const body = isComplaint
      ? `Dear Sir/Madam,

I wish to formally file a complaint regarding improper discount computation at:

Establishment: ${businessName || 'N/A'}
Address: ${businessAddress || 'N/A'}
Date of Transaction: ${TODAY}
Discount Type: ${discountTypeLabel}

Under RA 7277 (Magna Carta for PWDs) and RA 9994 (Expanded Senior Citizens Act), I am entitled to a 20% discount plus VAT exemption on qualifying purchases.

CORRECT COMPUTATION:
Amount to Pay:         ${peso(computedTotal)}

ESTABLISHMENT CHARGED: ${peso(establishmentCharged)}
OVERCHARGED BY:        ${peso(discrepancy)}

I request that appropriate action be taken against this establishment for non-compliance with the applicable laws.
${lguSection}

Respectfully,
Diskwento App User

---
This is an auto-templated email generated by Diskwento Mobile App. All computations are based on RA 9994 (Expanded Senior Citizens Act) and RA 7277 (Magna Carta for Persons with Disability). The figures above were computed using the correct formula: (Price ÷ 1.12) × 0.80 for VAT-inclusive items.`
      : `Dear Sir/Madam,

I would like to bring to your attention a possible discrepancy I encountered during my recent transaction at:

Establishment: ${businessName || 'N/A'}
Address: ${businessAddress || 'N/A'}
Date of Transaction: ${TODAY}
Discount Type: ${discountTypeLabel}

As provided under RA 7277 (Magna Carta for PWDs) and RA 9994 (Expanded Senior Citizens Act), qualified individuals are entitled to a 20% discount plus VAT exemption. I have computed the applicable amount as follows:

COMPUTED AMOUNT (based on RA formula):
Amount to Pay:              ${peso(computedTotal)}

AMOUNT BILLED BY ESTABLISHMENT: ${peso(establishmentCharged)}
DIFFERENCE:                     ${peso(discrepancy)}

I kindly request a review of this transaction. Should a discrepancy be confirmed, I would appreciate the appropriate correction or clarification. I am open to providing additional documentation if needed.
${lguSection}

Respectfully,
Diskwento App User

---
This is an auto-templated email generated by Diskwento Mobile App. All computations are based on RA 9994 (Expanded Senior Citizens Act) and RA 7277 (Magna Carta for Persons with Disability). The figures above were computed using the correct formula: (Price ÷ 1.12) × 0.80 for VAT-inclusive items.`;

    const attachments: string[] = [];
    if (receiptPhotoUri) attachments.push(receiptPhotoUri);
    if (itemPhotoUri) attachments.push(itemPhotoUri);

    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(
        'Email Not Available',
        'No mail client found on this device. Here is your report:\n\n' + body,
        [{ text: 'OK' }],
      );
      return;
    }

    await MailComposer.composeAsync({
      recipients,
      ccRecipients: [REPORT_CC_EMAIL],
      subject,
      body,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    const reportId = await webhookPromise;
    if (reportId) {
      Alert.alert(
        'Report Submitted',
        `Your email has been prepared and sent to the selected agencies.\n\nDiskwento Reference: ${reportId}\n\nThis is your personal tracking number within Diskwento — you can find this report in your Transaction History. Note that this is not an official reference number from DTI, NCDA, or your local government office.`,
        [{
          text: 'View History',
          onPress: () => {
            router.dismissAll();
            router.push('/history');
          },
        }],
      );
      const txName = transactionName || businessName || 'Unknown';
      const txs = await getTransactions();
      const match = txs.find(t => t.name === txName);
      if (match) {
        await updateTransaction(match.id, { reported: true, reportId });
      } else {
        await saveTransaction({
          name: txName,
          discountType: dtParam === 'senior' ? 'senior' : 'pwd',
          items: [],
          originalTotal,
          vatDeducted,
          discountAmount,
          computedTotal,
          establishmentCharged,
          discrepancy,
          isCorrect: false,
          reported: true,
          reportId,
        });
      }
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: reportMode === 'concern' ? 'Raise a Concern' : 'File a Complaint',
          headerLargeTitle: true,
          headerStyle: { backgroundColor: bg },
          headerTintColor: Colors.danger,
          headerShadowVisible: false,
          headerLargeTitleStyle: { color: text },
        }}
      />

      <ScrollView
        style={[styles.scroll, { backgroundColor: bg }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
      >

        {/* ── EVIDENCE ─────────────────────────────────────────── */}
        <SectionLabel text="EVIDENCE" secondary={secondary} />
        <View style={[styles.card, { backgroundColor: card }]}>
          <PhotoRow
            label="Add Receipt Photo"
            caption="Photo of your official receipt · GPS stamp ON"
            photoUri={receiptPhotoUri}
            onPress={() => setReceiptCameraOpen(true)}
          />
          <Hairline />
          <PhotoRow
            label="Add Item/Product Photo"
            caption="Photo of the item or price tag"
            photoUri={itemPhotoUri}
            onPress={() => setItemCameraOpen(true)}
          />
        </View>

        {/* ── DETAILS ──────────────────────────────────────────── */}
        <SectionLabel text="DETAILS" secondary={secondary} />
        <View style={[styles.card, { backgroundColor: card }]}>
          <View style={styles.fieldRow}>
            <Text accessible={false} style={[styles.fieldLabel, { color: secondary }]}>Business Name</Text>
            <TextInput
              style={[styles.fieldInput, { color: text }]}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="e.g. Mercury Drug"
              placeholderTextColor={Colors.placeholder}
              returnKeyType="next"
              clearButtonMode="while-editing"
              maxFontSizeMultiplier={1.3}
              accessibilityLabel="Business name"
              accessibilityHint="Enter the name of the establishment"
            />
          </View>
          <Hairline />
          <View style={styles.fieldRow}>
            <Text accessible={false} style={[styles.fieldLabel, { color: secondary }]}>Address</Text>
            <TextInput
              style={[styles.fieldInput, { color: text }]}
              value={businessAddress}
              onChangeText={setBusinessAddress}
              placeholder="e.g. 2/F BGC Central Square, Taguig"
              placeholderTextColor={Colors.placeholder}
              returnKeyType="done"
              maxFontSizeMultiplier={1.3}
              accessibilityLabel="Business address"
              accessibilityHint="Enter the address of the establishment"
            />
          </View>
          <Hairline />
          <View
            accessible={true}
            accessibilityLabel={`Date, ${TODAY}`}
            style={styles.fieldRow}
          >
            <Text accessible={false} style={[styles.fieldLabel, { color: secondary }]}>Date</Text>
            <Text accessible={false} style={[styles.fieldValue, { color: text }]}>{TODAY}</Text>
          </View>
        </View>

        {/* ── DISCREPANCY ───────────────────────────────────────── */}
        <SectionLabel text="DISCREPANCY" secondary={secondary} />
        <View style={[styles.card, { backgroundColor: card }]}>
          <BRow label="Correct Amount"  value={peso(computedTotal)}      valueColor={Colors.success} text={text} secondary={secondary} />
          <Hairline />
          <BRow label="You Were Charged" value={peso(establishmentCharged)} text={text} secondary={secondary} />
          <View style={styles.totalDivider} />
          <BRow label="Overcharged By"  value={peso(discrepancy)}        valueColor={Colors.danger} hero text={text} secondary={secondary} />
        </View>

        {/* ── SEND TO ───────────────────────────────────────────── */}
        <SectionLabel text="SEND REPORT TO" secondary={secondary} />
        <View style={[styles.card, { backgroundColor: card }]}>
          <RecipientRow
            checked={sendDTI}
            onToggle={() => setSendDTI(v => !v)}
            acronym="DTI"
            name="Department of Trade and Industry"
            email="dti.fo-ncr@dti.gov.ph"
            caption="General consumer complaint"
          />
          <Hairline />
          <RecipientRow
            checked={sendNCDA}
            onToggle={() => setSendNCDA(v => !v)}
            acronym="NCDA"
            name="National Council on Disability Affairs"
            email="info@ncda.gov.ph"
            caption="PWD & Senior Citizen violations"
          />
          <>
            <Hairline />
            <Pressable
              accessibilityLabel={`${isPWD ? 'PDAO' : 'OSCA'}, ${isPWD ? 'Persons with Disability Affairs Office' : 'Office for Senior Citizens Affairs'}. Local Government Unit${selectedCity ? `, ${selectedCity.city}` : ', no city selected'}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: sendLGU, disabled: !selectedCity }}
              style={({ pressed }) => [styles.recipientRow, pressed && selectedCity ? { opacity: 0.7 } : null]}
              onPress={() => { if (selectedCity) setSendLGU(v => !v); }}
            >
              <View accessible={false} style={[styles.checkbox, sendLGU && styles.checkboxChecked, !selectedCity && { opacity: 0.35 }]}>
                {sendLGU && <Sym name="checkmark" size={13} tintColor="#fff" />}
              </View>
              <View accessible={false} style={styles.recipientBody}>
                <Text style={styles.recipientLine}>
                  <Text style={styles.recipientAcronym}>{isPWD ? 'PDAO' : 'OSCA'}</Text>
                  {'  '}
                  <Text style={styles.recipientName}>
                    {isPWD ? 'Persons with Disability Affairs Office' : 'Office for Senior Citizens Affairs'}
                  </Text>
                </Text>
                {selectedCity ? (
                  <Text style={styles.recipientEmail}>
                    {(isPWD ? selectedCity.pdao.email : selectedCity.osca.email) ?? 'Contact details included in report body'}
                  </Text>
                ) : null}
                <Text style={styles.recipientCaption} allowFontScaling={false}>Local Government Unit · Select city below</Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityLabel={`City or municipality. ${selectedCity ? selectedCity.city : 'Not selected'}`}
              accessibilityRole="button"
              accessibilityHint="Opens the city picker list"
              style={({ pressed }) => [styles.pdaoCityRow, { backgroundColor: isDark ? Colors.dark.background + '60' : Colors.background + '60' }, pressed && { opacity: 0.6 }]}
              onPress={() => setCityPickerOpen(true)}
            >
              <Text accessible={false} style={[styles.fieldLabel, { color: secondary }]}>City / Municipality</Text>
              <View accessible={false} style={styles.cityPickerRight}>
                {selectedCity ? (
                  <Text style={[styles.citySelectedText, { color: text }]}>{selectedCity.city}</Text>
                ) : (
                  <Text style={styles.cityPlaceholder}>Select city</Text>
                )}
                <Sym name="chevron.right" size={14} tintColor={Colors.placeholder} />
              </View>
            </Pressable>
          </>
        </View>

        {!canSend && (
          <Text style={styles.hint}>Select at least one recipient.</Text>
        )}

        <Pressable
          accessibilityLabel={reportMode === 'concern' ? 'Prepare inquiry email' : 'Prepare complaint email'}
          accessibilityRole="button"
          accessibilityHint={canSend ? 'Opens your mail app with the pre-filled report' : 'Select at least one recipient first'}
          accessibilityState={{ disabled: !canSend }}
          style={({ pressed }) => [
            styles.sendBtn,
            pressed && { opacity: 0.85 },
            !canSend && styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <Text accessible={false} style={styles.sendBtnText}>
            {reportMode === 'concern' ? 'Prepare Inquiry Email' : 'Prepare Complaint Email'}
          </Text>
        </Pressable>

        <Text
          accessible={false}
          style={styles.privacyNotice}
          allowFontScaling={false}
        >
          Anonymous incident data is recorded to help track violations nationwide. No personal information is collected.
        </Text>

      </ScrollView>

      <GPSCamera
        visible={receiptCameraOpen}
        defaultGPS
        onCapture={uri => setReceiptPhotoUri(uri)}
        onClose={() => setReceiptCameraOpen(false)}
      />
      <GPSCamera
        visible={itemCameraOpen}
        defaultGPS={false}
        onCapture={uri => setItemPhotoUri(uri)}
        onClose={() => setItemCameraOpen(false)}
      />
      <CityPickerModal
        visible={cityPickerOpen}
        isPWD={isPWD}
        onSelect={city => {
          setSelectedCity(city);
          setSendLGU(true);
          setCityPickerOpen(false);
        }}
        onClose={() => setCityPickerOpen(false)}
      />

      {/* ── Mode picker — shown before anything else ── */}
      <ReportModeModal
        visible={reportMode === null}
        onSelect={setReportMode}
        onDismiss={() => router.back()}
        card={card}
        text={text}
        secondary={secondary}
      />
    </>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ text, secondary }: { text: string; secondary: string }) {
  return <Text accessibilityRole="header" style={[styles.sectionLabel, { color: secondary }]} allowFontScaling={false}>{text}</Text>;
}

function Hairline() {
  return <View style={styles.hairline} />;
}

function BRow({
  label,
  value,
  valueColor,
  hero,
  text,
  secondary,
}: {
  label: string;
  value: string;
  valueColor?: string;
  hero?: boolean;
  text: string;
  secondary: string;
}) {
  return (
    <View
      accessible={true}
      accessibilityLabel={`${label}, ${value}`}
      style={[styles.bRow, hero && styles.bHeroRow]}
    >
      <Text accessible={false} style={[styles.bLabel, { color: secondary }, hero && styles.bHeroLabel, hero && { color: text }]}>
        {label}
      </Text>
      <Text
        accessible={false}
        style={[
          styles.bValue,
          { color: text },
          hero && styles.bHeroValue,
          valueColor ? { color: valueColor } : null,
        ]}
        maxFontSizeMultiplier={hero ? 1.2 : 1.3}
      >
        {value}
      </Text>
    </View>
  );
}

function PhotoRow({
  label,
  caption,
  photoUri,
  onPress,
}: {
  label: string;
  caption: string;
  photoUri: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={photoUri ? `${label}, photo taken. Tap to retake` : label}
      accessibilityRole="button"
      accessibilityHint={caption}
      style={({ pressed }) => [styles.photoRow, pressed && { opacity: 0.6 }]}
      onPress={onPress}
    >
      {photoUri ? (
        <Image accessible={false} source={{ uri: photoUri }} style={styles.thumbnail} resizeMode="cover" />
      ) : (
        <View accessible={false} style={styles.photoIconBox}>
          <Sym name="camera.fill" size={20} tintColor={Colors.danger} />
        </View>
      )}
      <View accessible={false} style={styles.photoTextBlock}>
        <Text style={[styles.photoLabel, { color: Colors.danger }]}>
          {photoUri ? 'Tap to Retake' : label}
        </Text>
        <Text style={styles.photoCaption} allowFontScaling={false}>{caption}</Text>
      </View>
      <Sym accessible={false} name="chevron.right" size={16} tintColor={Colors.placeholder} />
    </Pressable>
  );
}

function RecipientRow({
  checked,
  onToggle,
  acronym,
  name,
  email,
  caption,
}: {
  checked: boolean;
  onToggle: () => void;
  acronym: string;
  name: string;
  email: string;
  caption: string;
}) {
  return (
    <Pressable
      accessibilityLabel={`${acronym}, ${name}. ${caption}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={({ pressed }) => [styles.recipientRow, pressed && { opacity: 0.7 }]}
      onPress={onToggle}
    >
      <View accessible={false} style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Sym name="checkmark" size={13} tintColor="#fff" />}
      </View>
      <View accessible={false} style={styles.recipientBody}>
        <Text style={styles.recipientLine}>
          <Text style={styles.recipientAcronym}>{acronym}</Text>
          {'  '}
          <Text style={styles.recipientName}>{name}</Text>
        </Text>
        <Text style={styles.recipientEmail}>{email}</Text>
        <Text style={styles.recipientCaption} allowFontScaling={false}>{caption}</Text>
      </View>
    </Pressable>
  );
}

function ReportModeModal({
  visible,
  onSelect,
  onDismiss,
  card,
  text,
  secondary,
}: {
  visible: boolean;
  onSelect: (mode: 'complaint' | 'concern') => void;
  onDismiss: () => void;
  card: string;
  text: string;
  secondary: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
      accessibilityViewIsModal={true}
    >
      <Pressable style={styles.overlay} onPress={onDismiss} />
      <View style={[styles.sheet, { backgroundColor: card, paddingBottom: insets.bottom + 24 }]}>
        <View accessible={false} style={styles.sheetHandle} />
        <Text style={[styles.modeTitle, { color: text }]}>How would you like to proceed?</Text>
        <Text style={[styles.modeSub, { color: secondary }]}>
          Choose how your email will be written.
        </Text>

        {/* Complaint option */}
        <Pressable
          accessibilityLabel="File a Complaint"
          accessibilityRole="button"
          accessibilityHint="Formal report requesting action. Use this when you are certain you were overcharged."
          style={({ pressed }) => [styles.modeOption, pressed && { opacity: 0.75 }]}
          onPress={() => onSelect('complaint')}
        >
          <View accessible={false} style={[styles.modeIconBox, { backgroundColor: Colors.danger + '18' }]}>
            <Sym name="exclamationmark.triangle.fill" size={22} tintColor={Colors.danger} />
          </View>
          <View accessible={false} style={styles.modeTextBlock}>
            <Text style={[styles.modeOptionTitle, { color: text }]}>File a Complaint</Text>
            <Text style={[styles.modeOptionDesc, { color: secondary }]}>
              Formal report requesting action. Use this when you are certain you were overcharged.
            </Text>
          </View>
        </Pressable>

        <View accessible={false} style={[styles.modeDivider, { backgroundColor: Colors.separatorOpaque }]} />

        {/* Concern option */}
        <Pressable
          accessibilityLabel="Raise a Concern"
          accessibilityRole="button"
          accessibilityHint="Polite inquiry requesting a review. Use this if you are unsure and want a clarification first."
          style={({ pressed }) => [styles.modeOption, pressed && { opacity: 0.75 }]}
          onPress={() => onSelect('concern')}
        >
          <View accessible={false} style={[styles.modeIconBox, { backgroundColor: Colors.accent + '18' }]}>
            <Sym name="checkmark.circle.fill" size={22} tintColor={Colors.accent} />
          </View>
          <View accessible={false} style={styles.modeTextBlock}>
            <Text style={[styles.modeOptionTitle, { color: text }]}>Raise a Concern</Text>
            <Text style={[styles.modeOptionDesc, { color: secondary }]}>
              Polite inquiry requesting a review. Use this if you are unsure and want a clarification first.
            </Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          accessibilityHint="Dismisses this screen and returns to the previous page"
          style={({ pressed }) => [styles.modeCancelBtn, pressed && { opacity: 0.6 }]}
          onPress={onDismiss}
        >
          <Text accessible={false} style={[styles.modeCancelText, { color: secondary }]}>Go Back</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function CityPickerModal({
  visible,
  isPWD,
  onSelect,
  onClose,
}: {
  visible: boolean;
  isPWD: boolean;
  onSelect: (city: LGUContact) => void;
  onClose: () => void;
}) {
  const isDark    = useColorScheme() === 'dark';
  const bg        = isDark ? Colors.dark.background : Colors.background;
  const card      = isDark ? Colors.dark.card       : Colors.surface;
  const text      = isDark ? Colors.dark.text       : Colors.text;
  const secondary = isDark ? Colors.dark.secondary  : Colors.textSecondary;

  return (
    <Modal visible={visible} transparent animationType="slide" accessibilityViewIsModal={true}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: card }]}>
        <View accessible={false} style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: text }]}>Select City</Text>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            onPress={onClose}
            hitSlop={8}
          >
            <Sym name="xmark" size={22} tintColor={secondary} />
          </Pressable>
        </View>
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.sheetList}
        >
          {METRO_MANILA_LGUS.map((lgu, index) => {
            const hasData = isPWD ? lgu.pdao.hasData : lgu.osca.hasData;
            return (
              <React.Fragment key={lgu.city}>
                {index > 0 && <View accessible={false} style={[styles.sheetDivider, { backgroundColor: Colors.separatorOpaque }]} />}
                <Pressable
                  accessibilityLabel={`${lgu.city}, ${hasData ? 'contact details available' : 'limited contact details'}`}
                  accessibilityRole="button"
                  accessibilityHint="Selects this city as your local government unit"
                  style={({ pressed }) => [
                    styles.sheetRow,
                    pressed && { backgroundColor: bg },
                  ]}
                  onPress={() => onSelect(lgu)}
                >
                  <Text accessible={false} style={[styles.sheetRowCity, { color: text }]}>{lgu.city}</Text>
                  <Sym
                    accessible={false}
                    name={hasData ? 'checkmark.circle.fill' : 'exclamationmark.triangle.fill'}
                    size={18}
                    tintColor={hasData ? Colors.success : Colors.warning}
                  />
                </Pressable>
              </React.Fragment>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const HZ  = 16;
const CR  = 12;
const BTN = 14;

const styles = StyleSheet.create({
  scroll:  { flex: 1 },
  content: { paddingTop: 8 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 8,
    marginHorizontal: HZ,
  },

  card: {
    borderRadius: CR,
    marginHorizontal: HZ,
    overflow: 'hidden',
  },

  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.separatorOpaque,
    marginHorizontal: 16,
  },

  totalDivider: { height: 1, backgroundColor: Colors.separatorOpaque },

  // ── Photo row ──────────────────────────────────────────────────────────────
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  photoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: Colors.danger + '18',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    flexShrink: 0,
  },
  photoTextBlock: { flex: 1 },
  photoLabel:  { fontSize: 15, fontWeight: '600' },
  photoCaption: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  // ── Detail fields ──────────────────────────────────────────────────────────
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 44,
    gap: 12,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '500',
    width: 110,
    flexShrink: 0,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
    textAlign: 'right',
  },
  fieldValue: {
    flex: 1,
    fontSize: 15,
    textAlign: 'right',
    paddingVertical: 12,
  },

  // ── Discrepancy rows ───────────────────────────────────────────────────────
  bRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  bHeroRow: {
    paddingVertical: 16,
    backgroundColor: 'rgba(255,59,48,0.05)',
  },
  bLabel:     { fontSize: 15, fontWeight: '500' },
  bValue:     { fontSize: 15, fontWeight: '500', fontVariant: ['tabular-nums'] },
  bHeroLabel: { fontSize: 17, fontWeight: '600' },
  bHeroValue: { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },

  // ── Recipient rows ─────────────────────────────────────────────────────────
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.separator,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  },
  recipientBody:   { flex: 1 },
  recipientLine:   { fontSize: 15 },
  recipientAcronym: { fontWeight: '700', color: Colors.text },
  recipientName:   { fontWeight: '400', color: Colors.text },
  recipientEmail:  { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  recipientCaption: { fontSize: 12, color: Colors.placeholder, marginTop: 2 },

  // ── Send button ────────────────────────────────────────────────────────────
  sendBtn: {
    marginHorizontal: HZ,
    marginTop: 28,
    minHeight: 52,
    borderRadius: BTN,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 10,
    elevation: 5,
  },
  sendBtnDisabled: { opacity: 0.38, shadowOpacity: 0 },
  sendBtnText: { fontSize: 17, fontWeight: '600', color: '#fff', letterSpacing: 0.1 },

  hint: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 13,
    color: Colors.placeholder,
    lineHeight: 18,
  },

  privacyNotice: {
    marginTop: 12,
    marginHorizontal: HZ,
    fontSize: 12,
    color: Colors.placeholder,
    textAlign: 'center',
    lineHeight: 17,
  },

  // ── PDAO city picker sub-row ───────────────────────────────────────────────
  pdaoCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 44,
    gap: 12,
  },
  cityPickerRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  citySelectedText: {
    fontSize: 15,
    flexShrink: 1,
  },
  cityPlaceholder: {
    fontSize: 15,
    color: Colors.placeholder,
    flexShrink: 1,
    textAlign: 'right',
  },

  // ── Report mode picker ────────────────────────────────────────────────────
  modeTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 24,
    letterSpacing: -0.3,
  },
  modeSub: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    marginHorizontal: 24,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  modeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modeTextBlock: { flex: 1 },
  modeOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  modeOptionDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  modeDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
  },
  modeCancelBtn: {
    alignItems: 'center',
    paddingVertical: 18,
    marginTop: 4,
  },
  modeCancelText: {
    fontSize: 16,
    fontWeight: '500',
  },

  // ── City picker bottom sheet ───────────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.40)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '72%',
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.separator,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separatorOpaque,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  sheetList: { paddingVertical: 4 },
  sheetDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sheetRowCity: {
    fontSize: 16,
    fontWeight: '400',
  },
});
