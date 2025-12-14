type Primitive = string | number;

export const parseInFilter = (value?: string): string[] => {
  if (!value) return [];
  return value
    .replace(/[()]/g, "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const buildInFilter = (values: Primitive[]): string | undefined => {
  if (!values.length) return undefined;
  return `(${values.join(",")})`;
};

export const parseOverlapFilter = (value?: string): string[] => {
  if (!value) return [];
  return value
    .replace(/[{}]/g, "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const buildOverlapFilter = (
  values: Primitive[],
): string | undefined => {
  if (!values.length) return undefined;
  return `{${values.join(",")}}`;
};

export const toggleValueInList = (
  list: Primitive[],
  value: Primitive,
): Primitive[] => {
  const asString = String(value);
  const hasValue = list.some((item) => String(item) === asString);
  return hasValue
    ? list.filter((item) => String(item) !== asString)
    : [...list, value];
};

export type RangeFilter = {
  field: string;
  gte?: string;
  lte?: string;
};


