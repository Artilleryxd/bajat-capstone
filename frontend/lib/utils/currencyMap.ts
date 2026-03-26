export const currencyMap: Record<string, string> = {
  IN: "₹", // India
  US: "$", // United States
  GB: "£", // United Kingdom
  CA: "C$", // Canada
  AU: "A$", // Australia
  AE: "د.إ", // United Arab Emirates
  SG: "S$", // Singapore
  // Note: For Europe, you might handle it per country dynamically, but we'll add a default mapping format here
  AT: "€", BE: "€", CY: "€", EE: "€", EE: "€", FI: "€", FR: "€", DE: "€",
  GR: "€", IE: "€", IT: "€", LV: "€", LT: "€", LU: "€", MT: "€", NL: "€",
  PT: "€", SK: "€", SI: "€", ES: "€"
};

export const getCurrencySymbol = (countryCode: string) => {
  return currencyMap[countryCode] || "$"; // Default to USD 
};
