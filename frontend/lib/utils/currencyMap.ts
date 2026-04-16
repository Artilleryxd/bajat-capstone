import {
  countryToCurrencyCode,
  getCurrencyCode,
  getCurrencySymbolFromCode,
} from "@/lib/utils/countryToCurrency";

export const currencyMap: Record<string, string> = Object.fromEntries(
  Object.entries(countryToCurrencyCode).map(([countryCode, currencyCode]) => [
    countryCode,
    getCurrencySymbolFromCode(currencyCode),
  ])
);

export const getCurrencySymbol = (countryCode: string) => {
  const currencyCode = getCurrencyCode(countryCode);
  return getCurrencySymbolFromCode(currencyCode);
};
