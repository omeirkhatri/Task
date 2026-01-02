import { useGetList, useUpdate, useNotify } from "ra-core";
import { useCallback } from "react";

export interface PaymentSetting {
  id: number;
  payment_method: "POS" | "Tabby" | "Payment Link" | "Ziina" | "Cash";
  fee_percentage: number | null;
  fixed_fee_amount: number | null;
  vat_percentage: number;
  is_active: boolean;
}

export interface UpdatePaymentSettingsParams {
  fee_percentage?: number | null;
  fixed_fee_amount?: number | null;
  vat_percentage?: number;
  is_active?: boolean;
}

/**
 * Hook for managing payment settings (bank charge defaults)
 * 
 * @returns Object with payment settings data, loading state, and update function
 * 
 * @example
 * ```tsx
 * const { data, isLoading, updateSettings } = usePaymentSettings();
 * 
 * // Update a payment setting
 * await updateSettings('POS', {
 *   fee_percentage: 1.9,
 *   fixed_fee_amount: null,
 *   vat_percentage: 5
 * });
 * ```
 */
export function usePaymentSettings() {
  const notify = useNotify();
  const { data, isLoading, refetch } = useGetList<PaymentSetting>(
    "payment_settings",
    {
      pagination: { page: 1, perPage: 100 },
      sort: { field: "payment_method", order: "ASC" },
    }
  );

  const [update] = useUpdate<PaymentSetting>();

  const updateSettings = useCallback(
    async (
      paymentMethod: PaymentSetting["payment_method"],
      updates: UpdatePaymentSettingsParams
    ): Promise<void> => {
      const setting = data?.find((s) => s.payment_method === paymentMethod);
      if (!setting) {
        throw new Error(`Payment setting for ${paymentMethod} not found`);
      }

      try {
        await update(
          "payment_settings",
          {
            id: setting.id,
            data: updates,
            previousData: setting,
          },
          {
            mutationMode: "pessimistic",
          }
        );
        await refetch();
      } catch (error) {
        throw error;
      }
    },
    [data, update, refetch]
  );

  const updateAllSettings = useCallback(
    async (
      updates: Record<PaymentSetting["payment_method"], UpdatePaymentSettingsParams>
    ): Promise<void> => {
      if (!data) {
        throw new Error("Payment settings not loaded");
      }

      try {
        const updatePromises = Object.entries(updates).map(async ([method, updateData]) => {
          const setting = data.find((s) => s.payment_method === method as PaymentSetting["payment_method"]);
          if (!setting) return;

          await update(
            "payment_settings",
            {
              id: setting.id,
              data: updateData,
              previousData: setting,
            },
            {
              mutationMode: "pessimistic",
            }
          );
        });

        await Promise.all(updatePromises);
        await refetch();
        notify("Payment settings updated successfully", { type: "success" });
      } catch (error) {
        notify("Failed to update payment settings", { type: "error" });
        throw error;
      }
    },
    [data, update, refetch, notify]
  );

  return {
    data,
    isLoading,
    updateSettings,
    updateAllSettings,
    refetch,
  };
}

