/**
 * Maps ISO 3166-1 alpha-2 country codes to ISO 4217 currency codes.
 * Used to auto-set the currency field in user_profiles based on the user's country.
 */
export const countryToCurrencyCode: Record<string, string> = {
  // Asia
  IN: "INR",
  JP: "JPY",
  CN: "CNY",
  KR: "KRW",
  SG: "SGD",
  MY: "MYR",
  TH: "THB",
  ID: "IDR",
  PH: "PHP",
  VN: "VND",
  BD: "BDT",
  PK: "PKR",
  LK: "LKR",
  NP: "NPR",
  MM: "MMK",
  KH: "KHR",
  // Middle East
  AE: "AED",
  SA: "SAR",
  QA: "QAR",
  KW: "KWD",
  BH: "BHD",
  OM: "OMR",
  IL: "ILS",
  TR: "TRY",
  // Americas
  US: "USD",
  CA: "CAD",
  MX: "MXN",
  BR: "BRL",
  AR: "ARS",
  CL: "CLP",
  CO: "COP",
  PE: "PEN",
  // Europe (non-Euro)
  GB: "GBP",
  CH: "CHF",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
  PL: "PLN",
  CZ: "CZK",
  HU: "HUF",
  RO: "RON",
  BG: "BGN",
  HR: "HRK",
  RU: "RUB",
  UA: "UAH",
  // Eurozone
  AT: "EUR", BE: "EUR", CY: "EUR", EE: "EUR", FI: "EUR", FR: "EUR", DE: "EUR",
  GR: "EUR", IE: "EUR", IT: "EUR", LV: "EUR", LT: "EUR", LU: "EUR", MT: "EUR",
  NL: "EUR", PT: "EUR", SK: "EUR", SI: "EUR", ES: "EUR",
  // Oceania
  AU: "AUD",
  NZ: "NZD",
  // Africa
  ZA: "ZAR",
  NG: "NGN",
  KE: "KES",
  EG: "EGP",
  GH: "GHS",
  TZ: "TZS",
  ET: "ETB",
};

/**
 * Get the ISO 4217 currency code for a given country ISO code.
 * Defaults to USD if the country is not in the map.
 */
export function getCurrencyCode(countryIsoCode: string): string {
  return countryToCurrencyCode[countryIsoCode] || "USD";
}
