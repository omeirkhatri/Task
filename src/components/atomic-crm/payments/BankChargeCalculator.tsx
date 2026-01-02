import { usePaymentSettings } from "@/hooks/usePaymentSettings";
import type { PaymentSettings } from "./types";

export interface BankChargeCalculation {
  baseFee: number;
  vatAmount: number;
  totalCharge: number;
}

/**
 * Calculates bank charge based on payment method and amount
 * Formula: (amount × fee_percentage + fixed_fee_amount) × (1 + vat_percentage/100)
 * 
 * @param amount - The payment amount
 * @param paymentMethod - The payment method (POS, Tabby, Payment Link, Ziina, Cash)
 * @param settings - Payment settings data (optional, will fetch if not provided)
 * @returns Bank charge calculation breakdown or null if settings not found
 */
export function calculateBankCharge(
  amount: number,
  paymentMethod: PaymentSettings["payment_method"],
  settings?: PaymentSettings[]
): BankChargeCalculation | null {
  if (!settings || settings.length === 0) {
    return null;
  }

  const setting = settings.find((s) => s.payment_method === paymentMethod);
  if (!setting || !setting.is_active) {
    return null;
  }

  const feePercentage = setting.fee_percentage || 0;
  const fixedFee = setting.fixed_fee_amount || 0;
  const vatPercentage = setting.vat_percentage || 0;

  // Calculate base fee: (amount × fee_percentage) + fixed_fee_amount
  const baseFee = (amount * (feePercentage / 100)) + fixedFee;

  // Calculate VAT on the base fee
  const vatAmount = baseFee * (vatPercentage / 100);

  // Total charge = base fee + VAT
  const totalCharge = baseFee + vatAmount;

  return {
    baseFee: Math.round(baseFee * 100) / 100, // Round to 2 decimal places
    vatAmount: Math.round(vatAmount * 100) / 100,
    totalCharge: Math.round(totalCharge * 100) / 100,
  };
}

/**
 * Hook to get bank charge calculation with automatic settings fetching
 */
export function useBankChargeCalculation(
  amount: number | null | undefined,
  paymentMethod: PaymentSettings["payment_method"] | null | undefined
): {
  calculation: BankChargeCalculation | null;
  isLoading: boolean;
} {
  const { data: settings, isLoading } = usePaymentSettings();

  if (!amount || !paymentMethod || !settings) {
    return { calculation: null, isLoading };
  }

  const calculation = calculateBankCharge(amount, paymentMethod, settings);

  return { calculation, isLoading };
}

