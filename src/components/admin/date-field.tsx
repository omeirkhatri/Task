import type { HTMLAttributes } from "react";
import { useFieldValue, useTranslate } from "ra-core";

import { getCrmTimeZone } from "@/components/atomic-crm/misc/timezone";
import { genericMemo } from "@/lib/genericMemo";
import type { FieldProps } from "@/lib/field.type";

/**
 * Display a date value as a locale string.
 *
 * Uses Intl.DateTimeFormat() if available, passing the locales and options props as arguments.
 * If Intl is not available, it outputs date as is (and ignores the locales and options props).
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString
 * @example
 * <DateField source="published_at" />
 * // renders the record { id: 1234, published_at: new Date('2012-11-07') } as
 * <span>07/11/2012</span>
 *
 * <DateField source="published_at" className="red" />
 * // renders the record { id: 1234, new Date('2012-11-07') } as
 * <span class="red">07/11/2012</span>
 *
 * <DateField source="share" options={{ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }} />
 * // renders the record { id: 1234, new Date('2012-11-07') } as
 * <span>Wednesday, November 7, 2012</span>
 *
 * <DateField source="price" locales="fr-FR" options={{ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }} />
 * // renders the record { id: 1234, new Date('2012-11-07') } as
 * <span>mercredi 7 novembre 2012</span>
 */
const DateFieldImpl = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RecordType extends Record<string, any> = Record<string, any>,
>(
  inProps: DateFieldProps<RecordType>,
) => {
  const {
    empty,
    locales,
    options,
    showTime = false,
    showDate = true,
    transform = defaultTransform,
    source,
    record,
    defaultValue,
    ...rest
  } = inProps;
  const translate = useTranslate();

  if (!showTime && !showDate) {
    throw new Error(
      "<DateField> cannot have showTime and showDate false at the same time",
    );
  }

  const value = useFieldValue({ source, record, defaultValue });
  if (value == null || value === "") {
    if (!empty) {
      return null;
    }

    return (
      <span {...rest}>
        {typeof empty === "string" ? translate(empty, { _: empty }) : empty}
      </span>
    );
  }

  const date = transform(value);

  let dateString = "";
  const currentTimeZone = getCrmTimeZone();
  // Default to DD/MM/YYYY format
  const defaultDateOptions: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: currentTimeZone,
  };
  const enforcedOptions = { ...defaultDateOptions, ...options, timeZone: currentTimeZone };
  const defaultLocales = locales || "en-GB";
  
  if (date) {
    if (showTime && showDate) {
      // For date+time, format date as DD/MM/YYYY and time separately
      const dateFormatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: currentTimeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const timeFormatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: currentTimeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const dateParts = dateFormatter.formatToParts(date);
      const day = dateParts.find((p) => p.type === "day")?.value || "";
      const month = dateParts.find((p) => p.type === "month")?.value || "";
      const year = dateParts.find((p) => p.type === "year")?.value || "";
      const timeStr = timeFormatter.format(date);
      dateString = `${day}/${month}/${year} ${timeStr}`;
    } else if (showDate) {
      // Format as DD/MM/YYYY explicitly
      const dateFormatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: currentTimeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const dateParts = dateFormatter.formatToParts(date);
      const day = dateParts.find((p) => p.type === "day")?.value || "";
      const month = dateParts.find((p) => p.type === "month")?.value || "";
      const year = dateParts.find((p) => p.type === "year")?.value || "";
      dateString = `${day}/${month}/${year}`;
    } else if (showTime) {
      dateString = toLocaleStringSupportsLocales
        ? date.toLocaleTimeString(defaultLocales, enforcedOptions)
        : date.toLocaleTimeString();
    }
  }

  return <span {...rest}>{dateString}</span>;
};
DateFieldImpl.displayName = "DateFieldImpl";

export const DateField = genericMemo(DateFieldImpl);

export interface DateFieldProps<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RecordType extends Record<string, any> = Record<string, any>,
> extends FieldProps<RecordType>,
    HTMLAttributes<HTMLSpanElement> {
  locales?: Intl.LocalesArgument;
  options?: Intl.DateTimeFormatOptions;
  showTime?: boolean;
  showDate?: boolean;
  transform?: (value: unknown) => Date;
}

const defaultTransform = (value: unknown) =>
  value instanceof Date
    ? value
    : typeof value === "string" || typeof value === "number"
      ? new Date(value)
      : undefined;

const toLocaleStringSupportsLocales = (() => {
  // from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString
  try {
    new Date().toLocaleString("i");
  } catch (error) {
    return error instanceof RangeError;
  }
  return false;
})();
