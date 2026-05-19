export type VatRate = {
  country: string;
  code: string;
  flag: string;
  rate: number;
  label: string;
};

export const VAT_RATES: VatRate[] = [
  { country: 'Singapore',     code: 'SG', flag: '🇸🇬', rate: 0.09, label: 'GST' },
  { country: 'Taiwan',        code: 'TW', flag: '🇹🇼', rate: 0.05, label: 'VAT' },
  { country: 'Japan',         code: 'JP', flag: '🇯🇵', rate: 0.10, label: 'Consumption Tax' },
  { country: 'South Korea',   code: 'KR', flag: '🇰🇷', rate: 0.10, label: 'VAT' },
  { country: 'Hong Kong',     code: 'HK', flag: '🇭🇰', rate: 0,    label: 'No VAT' },
  { country: 'Thailand',      code: 'TH', flag: '🇹🇭', rate: 0.07, label: 'VAT' },
  { country: 'Indonesia',     code: 'ID', flag: '🇮🇩', rate: 0.11, label: 'VAT' },
  { country: 'Vietnam',       code: 'VN', flag: '🇻🇳', rate: 0.10, label: 'VAT' },
  { country: 'Australia',     code: 'AU', flag: '🇦🇺', rate: 0.10, label: 'GST' },
  { country: 'UAE',           code: 'AE', flag: '🇦🇪', rate: 0.05, label: 'VAT' },
  { country: 'Saudi Arabia',  code: 'SA', flag: '🇸🇦', rate: 0.15, label: 'VAT' },
  { country: 'Qatar',         code: 'QA', flag: '🇶🇦', rate: 0,    label: 'No VAT' },
  { country: 'United Kingdom',code: 'GB', flag: '🇬🇧', rate: 0.20, label: 'VAT' },
  { country: 'Germany',       code: 'DE', flag: '🇩🇪', rate: 0.19, label: 'VAT' },
  { country: 'France',        code: 'FR', flag: '🇫🇷', rate: 0.20, label: 'VAT' },
  { country: 'Italy',         code: 'IT', flag: '🇮🇹', rate: 0.22, label: 'VAT' },
  { country: 'Norway',        code: 'NO', flag: '🇳🇴', rate: 0.25, label: 'VAT' },
  { country: 'Hungary',       code: 'HU', flag: '🇭🇺', rate: 0.27, label: 'VAT' },
  { country: 'USA',           code: 'US', flag: '🇺🇸', rate: 0,    label: 'No VAT' },
  { country: 'Canada',        code: 'CA', flag: '🇨🇦', rate: 0.05, label: 'GST' },
];
