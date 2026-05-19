import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedTransaction {
  id: string;
  name: string;
  discountType: 'pwd' | 'senior';
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    vatInclusive: boolean;
  }>;
  originalTotal: number;
  vatDeducted: number;
  discountAmount: number;
  computedTotal: number;
  establishmentCharged: number;
  discrepancy: number;
  isCorrect: boolean;
  timestamp: number;
  reportId?: string;
  reported?: boolean;
}

const STORAGE_KEY = 'diskwento_transactions';
const MAX_TRANSACTIONS = 50;
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

async function read(): Promise<SavedTransaction[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedTransaction[]) : [];
  } catch {
    return [];
  }
}

async function write(txs: SavedTransaction[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(txs));
}

export async function saveTransaction(
  tx: Omit<SavedTransaction, 'id' | 'timestamp'>
): Promise<void> {
  try {
    const now = Date.now();
    const existing = await read();
    const fresh = existing
      .filter(t => now - t.timestamp < TWO_DAYS_MS)
      .slice(-(MAX_TRANSACTIONS - 1));
    const newTx: SavedTransaction = {
      ...tx,
      id: now.toString(36) + Math.random().toString(36).slice(2, 7),
      timestamp: now,
    };
    await write([...fresh, newTx]);
  } catch (e) {
    console.error('saveTransaction error:', e);
    throw e;
  }
}

export async function getTransactions(): Promise<SavedTransaction[]> {
  try {
    const now = Date.now();
    const all = await read();
    const fresh = all.filter(t => now - t.timestamp < TWO_DAYS_MS);
    if (fresh.length !== all.length) await write(fresh);
    return fresh.slice().reverse(); // newest first
  } catch (e) {
    console.error('getTransactions error:', e);
    return [];
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  try {
    const all = await read();
    await write(all.filter(t => t.id !== id));
  } catch (e) {
    console.error('deleteTransaction error:', e);
    throw e;
  }
}

export async function clearAllTransactions(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function updateTransaction(
  id: string,
  updates: Partial<SavedTransaction>
): Promise<void> {
  try {
    const all = await read();
    const patched = all.map(t => t.id === id ? { ...t, ...updates } : t);
    await write(patched);
  } catch (e) {
    console.error('updateTransaction error:', e);
  }
}

export async function updateTransactionReport(
  name: string,
  reportId: string
): Promise<void> {
  try {
    const all = await read();
    let updated = false;
    const patched = all.map(t => {
      if (!updated && t.name === name) {
        updated = true;
        return { ...t, reported: true, reportId };
      }
      return t;
    });
    if (updated) await write(patched);
  } catch (e) {
    console.error('updateTransactionReport error:', e);
  }
}

// ─── VAT Transactions ─────────────────────────────────────────────────────────

export interface VatTransaction {
  id: string;
  label: string;
  price: number;      // VAT-inclusive price entered
  exVat: number;      // base price before tax
  vatAmount: number;  // 12% tax amount
  timestamp: number;
}

const VAT_STORAGE_KEY = 'diskwento_vat_transactions';
const VAT_TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const VAT_MAX = 50;

async function readVat(): Promise<VatTransaction[]> {
  try {
    const raw = await AsyncStorage.getItem(VAT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as VatTransaction[]) : [];
  } catch {
    return [];
  }
}

async function writeVat(txs: VatTransaction[]): Promise<void> {
  await AsyncStorage.setItem(VAT_STORAGE_KEY, JSON.stringify(txs));
}

export async function saveVatTransaction(
  tx: Omit<VatTransaction, 'id' | 'timestamp'>,
): Promise<void> {
  const now = Date.now();
  const existing = await readVat();
  const fresh = existing
    .filter(t => now - t.timestamp < VAT_TWO_DAYS_MS)
    .slice(-(VAT_MAX - 1));
  await writeVat([...fresh, {
    ...tx,
    id: now.toString(36) + Math.random().toString(36).slice(2, 7),
    timestamp: now,
  }]);
}

export async function getVatTransactions(): Promise<VatTransaction[]> {
  const now = Date.now();
  const all = await readVat();
  const fresh = all.filter(t => now - t.timestamp < VAT_TWO_DAYS_MS);
  if (fresh.length !== all.length) await writeVat(fresh);
  return fresh.slice().reverse();
}

export async function deleteVatTransaction(id: string): Promise<void> {
  const all = await readVat();
  await writeVat(all.filter(t => t.id !== id));
}

export async function clearAllVatTransactions(): Promise<void> {
  await AsyncStorage.removeItem(VAT_STORAGE_KEY);
}

// ─── Document Vault ───────────────────────────────────────────────────────────

export type DocumentType = 'reseta' | 'pwd-id' | 'senior-id';

export interface StoredDocument {
  id: string;
  uri: string;        // permanent file:// path via expo-file-system
  dateAdded: number;  // ms timestamp
  label?: string;
}

const DOC_META_KEY = (type: DocumentType) => `diskwento_docs_${type}`;

async function readDocs(type: DocumentType): Promise<StoredDocument[]> {
  try {
    const raw = await AsyncStorage.getItem(DOC_META_KEY(type));
    return raw ? (JSON.parse(raw) as StoredDocument[]) : [];
  } catch {
    return [];
  }
}

async function writeDocs(type: DocumentType, docs: StoredDocument[]): Promise<void> {
  await AsyncStorage.setItem(DOC_META_KEY(type), JSON.stringify(docs));
}

export async function getDocuments(type: DocumentType): Promise<StoredDocument[]> {
  return readDocs(type);
}

export async function addDocument(
  type: DocumentType,
  uri: string,
  label?: string,
): Promise<StoredDocument> {
  const existing = await readDocs(type);
  const doc: StoredDocument = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    uri,
    dateAdded: Date.now(),
    label,
  };
  await writeDocs(type, [...existing, doc]);
  return doc;
}

export async function deleteDocument(type: DocumentType, id: string): Promise<string | null> {
  const existing = await readDocs(type);
  const target = existing.find(d => d.id === id);
  await writeDocs(type, existing.filter(d => d.id !== id));
  return target?.uri ?? null;
}

export function formatDocumentDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Transaction helpers ───────────────────────────────────────────────────────

export function formatTransactionDate(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  const timeStr = date.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (diffHours < 24) return `Today ${timeStr}`;
  if (diffHours < 48) return `Yesterday ${timeStr}`;
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}
