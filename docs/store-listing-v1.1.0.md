# Diskwento v1.1.0 — Store Listing Copy

---

## APP STORE (iOS)

### What's New (paste in App Store Connect → Version Information)

```
Here's what's new in Version 1.1.0:

Reseta & ID Vault
Store your prescriptions and discount IDs as photos — kept privately on your device. No cloud, no account needed. Tap a photo to view it full screen. Pinch to zoom in.

Transaction History
Every discount check and VAT calculation you save is now stored in one place, organized by date. Swipe left to delete any entry.

VAT Calculator
A new standalone tool to see exactly how much 12% VAT is embedded in any price — plus a comparison with VAT rates from over 20 countries worldwide.

Accessibility
Full VoiceOver support across every screen. Reduce Motion support for motion-sensitive users. Improved font scaling for large text settings.
```

---

### App Description (paste in App Store Connect → App Information)

```
Diskwento is the free discount checker for PWD (Persons with Disability) and Senior Citizens in the Philippines.

Know your rights. Verify your receipt. File a complaint — all in one app.

─── DISCOUNT CHECKER ───
Based on RA 9994 and RA 7277, you are entitled to a 20% discount plus VAT exemption on covered goods and services. Diskwento calculates what you should have paid, compares it to what you were charged, and tells you instantly if you were overcharged.

• Supports PWD and Senior Citizen discount types
• Handles VAT-inclusive and VAT-exclusive prices per item
• Shows exact breakdown: base price, VAT removed, discount applied, correct total

─── REPORT FILING ───
If overcharged, file a formal complaint or inquiry to the relevant government agencies directly from the app.

• File to DTI, NCDA, PDAO (local), or OSCA (local)
• Choose between a formal complaint or an inquiry
• Attach GPS-tagged receipt photos as evidence
• Select your city for routing to your local PDAO/OSCA

─── VAT CALCULATOR ───
See exactly how much 12% VAT is in any price.

• Instant breakdown: base price, tax amount, VAT-inclusive total
• Compare with VAT rates from 20+ countries worldwide
• Save calculations to your history with a custom label

─── RESETA & ID VAULT ───
Store your prescriptions and discount IDs as photos, privately on your device.

• No cloud. No account. No internet required.
• Pinch to zoom and pan on any photo
• PWD ID and Senior Citizen ID stored separately

─── TRANSACTION HISTORY ───
Every discount check and VAT calculation you save is kept in one place.

• Unified timeline sorted by date
• Status tags: Correct, Overcharged, or Reported
• Swipe to delete any entry

─── PRIVACY ───
Diskwento does not collect your personal data. All data stays on your device. Internet is only used when you choose to file a complaint.

─── LEGAL BASIS ───
• RA 9994 — Expanded Senior Citizens Act of 2010
• RA 7277 — Magna Carta for Persons with Disability (as amended by RA 9442 and RA 10754)
```

---

### Keywords (100 characters max — paste in App Store Connect → Keywords)

```
PWD,senior citizen,discount,VAT,receipt,checker,OFW,Philippines,disability,20%
```

---

### Review Notes (for App Review — paste in App Store Connect → Review Information)

```
Diskwento is a discount verification app for PWD and Senior Citizens in the Philippines. No login is required. All core features work offline.

To test report filing: go to Discount Checker → enter any amount → tap Compare Now → tap Report. The report form will open. No actual email is sent during review — you can dismiss the mail composer.

Camera and location permissions are only requested when the user taps to add a receipt photo in the report form.
```

---

---

## GOOGLE PLAY (Android)

### What's New in this version (max 500 characters — paste in Play Console → Release notes)

```
New in 1.1.0:

• Reseta & ID Vault — store prescriptions and IDs as photos, privately on-device
• Transaction History — all your checks and VAT calculations in one place
• VAT Calculator — 12% breakdown + compare with 20+ countries
• Full TalkBack support across all screens
• Reduce Motion support
• Fixed: image viewer zoom, gesture lag, save transaction modal
```

---

### Short Description (max 80 characters — paste in Play Console → Store listing)

```
Discount checker for PWD & Senior Citizens in the Philippines.
```

---

### Full Description (paste in Play Console → Store listing)

```
Diskwento is the free discount checker for PWD (Persons with Disability) and Senior Citizens in the Philippines.

Know your rights. Verify your receipt. File a complaint — all in one app.

DISCOUNT CHECKER
Based on RA 9994 and RA 7277, you are entitled to a 20% discount plus VAT exemption on covered goods and services. Diskwento calculates what you should have paid, compares it to what you were charged, and tells you instantly if you were overcharged.

✓ Supports PWD and Senior Citizen discount types
✓ Handles VAT-inclusive and VAT-exclusive prices per item
✓ Shows exact breakdown: base price, VAT removed, discount applied, correct total

REPORT FILING
If overcharged, file a formal complaint or inquiry to the relevant government agencies directly from the app.

✓ File to DTI, NCDA, PDAO (local), or OSCA (local)
✓ Choose between a formal complaint or an inquiry
✓ Attach GPS-tagged receipt photos as evidence
✓ Select your city for routing to your local PDAO/OSCA

VAT CALCULATOR
See exactly how much 12% VAT is in any price.

✓ Instant breakdown: base price, tax amount, VAT-inclusive total
✓ Compare with VAT rates from 20+ countries worldwide
✓ Save calculations to your history with a custom label

RESETA & ID VAULT
Store your prescriptions and discount IDs as photos, privately on your device.

✓ No cloud. No account. No internet required.
✓ Pinch to zoom and pan on any photo
✓ PWD ID and Senior Citizen ID stored separately

TRANSACTION HISTORY
Every discount check and VAT calculation you save is kept in one place.

✓ Unified timeline sorted by date
✓ Status tags: Correct, Overcharged, or Reported
✓ Swipe to delete any entry

PRIVACY
Diskwento does not collect your personal data. All data stays on your device. Internet is only used when you choose to file a complaint.

LEGAL BASIS
• RA 9994 — Expanded Senior Citizens Act of 2010
• RA 7277 — Magna Carta for Persons with Disability (as amended by RA 9442 and RA 10754)
```

---

---

## BUILD & SUBMIT COMMANDS

Run these from the project root (`/Users/carloicorcuera/Documents/CharileChaplin/diskwento`).

### iOS — Build + Submit

```bash
# Build for App Store
eas build --platform ios --profile production

# Once build completes, submit to App Store Connect
eas submit --platform ios
```

Or in one step:
```bash
eas build --platform ios --profile production --auto-submit
```

### Android — Build + Submit

```bash
# Build AAB for Google Play
eas build --platform android --profile production

# Once build completes, submit to Play Console
eas submit --platform android
```

Or in one step:
```bash
eas build --platform android --profile production --auto-submit
```

---

## SCREENSHOTS TO UPDATE

The following new screens should have screenshots added in both stores:

| Screen | Why it matters |
|--------|---------------|
| VAT Calculator | Brand new feature — not in v1.0.0 |
| Reseta Vault | Brand new feature |
| Discount ID | Brand new feature |
| Transaction History | Brand new feature |
| Home screen | Row labels and subtitles changed |

**Recommended order for App Store screenshots (6.7" iPhone):**
1. Home screen
2. Discount Checker (result screen showing overcharge)
3. Report Filing
4. VAT Calculator
5. Transaction History
6. Reseta / ID Vault

---

## CHECKLIST

### App Store Connect
- [ ] Bump version to 1.1.0 in the new version form (already set in app.json)
- [ ] Paste "What's New" text
- [ ] Update app description
- [ ] Update keywords
- [ ] Add/replace screenshots (optional but recommended)
- [ ] Add review notes
- [ ] Submit build after `eas submit` completes
- [ ] Submit for review

### Google Play Console
- [ ] Create new release in Production track
- [ ] Paste "What's new in this version" text
- [ ] Update short + full description
- [ ] Add/replace screenshots (optional but recommended)
- [ ] Upload AAB from `eas submit` or manually upload
- [ ] Submit for review
