import { useGetList, useUpdate, useNotify, useGetOne } from "ra-core";
import { useCallback, useMemo, useEffect } from "react";

export interface OfficeLocation {
  latitude: number;
  longitude: number;
  address: string;
}

export interface GeneralSetting {
  id: number;
  setting_key: string;
  setting_value: any;
  description?: string;
}

const DEFAULT_OFFICE_LOCATION: OfficeLocation = {
  latitude: 25.2048,
  longitude: 55.2708,
  address: "Office, Dubai, UAE",
};

/**
 * Hook for managing office location configuration from database
 * 
 * @returns Object with office location, loading state, and update function
 * 
 * @example
 * ```tsx
 * const { officeLocation, isLoading, updateOfficeLocation } = useOfficeLocation();
 * 
 * // Update office location
 * await updateOfficeLocation({
 *   latitude: 25.2048,
 *   longitude: 55.2708,
 *   address: "My Office, Dubai"
 * });
 * ```
 */
export function useOfficeLocation() {
  const notify = useNotify();
  
  // Fetch office location setting from database
  const { data: settings, isLoading, refetch } = useGetList<GeneralSetting>(
    "general_settings",
    {
      pagination: { page: 1, perPage: 100 },
      filter: { setting_key: "office_location" },
    }
  );

  const [update] = useUpdate<GeneralSetting>();

  // Extract office location from settings
  const officeLocation = useMemo<OfficeLocation>(() => {
    const setting = settings?.[0];
    if (setting?.setting_value) {
      const value = setting.setting_value;
      // Validate coordinates
      if (
        typeof value.latitude === "number" &&
        typeof value.longitude === "number" &&
        value.latitude >= -90 &&
        value.latitude <= 90 &&
        value.longitude >= -180 &&
        value.longitude <= 180
      ) {
        return {
          latitude: value.latitude,
          longitude: value.longitude,
          address: value.address || "Office",
        };
      }
    }
    return DEFAULT_OFFICE_LOCATION;
  }, [settings]);

  // Sync to localStorage whenever office location changes (for non-React code that reads from localStorage)
  useEffect(() => {
    if (officeLocation && typeof window !== "undefined") {
      try {
        localStorage.setItem("crm_office_location", JSON.stringify(officeLocation));
      } catch (error) {
        // Ignore localStorage errors (e.g., quota exceeded)
        console.warn("Failed to sync office location to localStorage:", error);
      }
    }
  }, [officeLocation]);

  const updateOfficeLocation = useCallback(
    async (newLocation: OfficeLocation): Promise<void> => {
      // Validate coordinates
      if (
        typeof newLocation.latitude !== "number" ||
        typeof newLocation.longitude !== "number" ||
        isNaN(newLocation.latitude) ||
        isNaN(newLocation.longitude) ||
        newLocation.latitude < -90 ||
        newLocation.latitude > 90 ||
        newLocation.longitude < -180 ||
        newLocation.longitude > 180
      ) {
        throw new Error("Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.");
      }

      const setting = settings?.[0];
      if (!setting) {
        throw new Error("Office location setting not found in database");
      }

      try {
        await update(
          "general_settings",
          {
            id: setting.id,
            data: {
              setting_value: {
                latitude: newLocation.latitude,
                longitude: newLocation.longitude,
                address: newLocation.address,
              },
            },
            previousData: setting,
          },
          {
            mutationMode: "pessimistic",
          }
        );
        await refetch();
        notify("Office location updated successfully", { type: "success" });
        // Trigger a custom event so other parts of the app can react
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("office-location-changed", { detail: { officeLocation: newLocation } })
          );
        }
      } catch (error) {
        notify("Failed to update office location", { type: "error" });
        throw error;
      }
    },
    [settings, update, refetch, notify]
  );

  return {
    officeLocation,
    isLoading,
    updateOfficeLocation,
    refetch,
  };
}

/**
 * Gets the current office location (for use outside React components)
 * This is a synchronous function that reads from localStorage as fallback
 * For React components, use useOfficeLocation hook instead
 * 
 * @returns The current office location
 */
export function getOfficeLocationFromStorage(): OfficeLocation {
  // This is a fallback - in practice, components should use useOfficeLocation hook
  // But for non-React code, we can check localStorage as fallback
  if (typeof window === "undefined") {
    return DEFAULT_OFFICE_LOCATION;
  }
  try {
    const stored = localStorage.getItem("crm_office_location");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (
        typeof parsed.latitude === "number" &&
        typeof parsed.longitude === "number" &&
        parsed.latitude >= -90 &&
        parsed.latitude <= 90 &&
        parsed.longitude >= -180 &&
        parsed.longitude <= 180
      ) {
        return parsed;
      }
    }
  } catch (error) {
    // Ignore errors
  }
  return DEFAULT_OFFICE_LOCATION;
}

