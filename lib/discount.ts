const VAT_RATE = 0.12;
const DISCOUNT_RATE = 0.20;

export type DiscountType = 'pwd' | 'senior';

export interface LineItem {
  name: string;
  price: number; // as entered (VAT-inclusive or VAT-exempt)
  quantity: number;
  vatInclusive: boolean;
}

export interface DiscountResult {
  originalTotal: number;
  computedTotal: number;
  discountAmount: number;
  vatDeducted: number;
  // Reserved for future receipt-comparison feature.
  // Always 0 when computed internally; non-zero when a store receipt
  // total differs from computedTotal.
  discrepancy: number;
}

/**
 * Computes the PWD / Senior Citizen discount per RA 9994 / RA 7277.
 *
 * VAT-inclusive items: remove VAT first, then apply 20% discount.
 *   discounted = (price / 1.12) * 0.80
 *
 * VAT-exempt items: apply 20% discount directly.
 *   discounted = price * 0.80
 */
export function computeDiscount(items: LineItem[]): DiscountResult {
  let originalTotal = 0;
  let computedTotal = 0;
  let vatDeducted = 0;

  for (const item of items) {
    const lineOriginal = item.price * item.quantity;
    originalTotal += lineOriginal;

    if (item.vatInclusive) {
      const priceExVat = item.price / (1 + VAT_RATE);
      const lineVat = (item.price - priceExVat) * item.quantity;
      const lineDiscounted = priceExVat * (1 - DISCOUNT_RATE) * item.quantity;
      vatDeducted += lineVat;
      computedTotal += lineDiscounted;
    } else {
      const lineDiscounted = item.price * (1 - DISCOUNT_RATE) * item.quantity;
      computedTotal += lineDiscounted;
    }
  }

  const discountAmount = originalTotal - computedTotal - vatDeducted;
  const discrepancy = 0; // set externally when comparing against a store receipt

  return {
    originalTotal: round2(originalTotal),
    computedTotal: round2(computedTotal),
    discountAmount: round2(discountAmount),
    vatDeducted: round2(vatDeducted),
    discrepancy: round2(discrepancy),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
