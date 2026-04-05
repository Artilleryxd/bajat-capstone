/**
 * Reverse-geocodes lat/lng coordinates into a human-readable location
 * using the free OpenStreetMap Nominatim API.
 *
 * Returns the neighbourhood/suburb name (for the `neighbourhood` field in user_profiles).
 */

export interface ReverseGeoResult {
  neighbourhood: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  countryCode: string | null; // ISO 3166-1 alpha-2 (uppercase)
  displayName: string;
}

interface NominatimAddress {
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city_district?: string;
  village?: string;
  hamlet?: string;
  town?: string;
  city?: string;
  municipality?: string;
  state?: string;
  state_district?: string;
  country?: string;
  country_code?: string;
}

/**
 * Requests the user's current position from the browser Geolocation API.
 * Returns a Promise that resolves with the coords or rejects with an error message.
 */
export function getBrowserLocation(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject("Location permission was denied. You can enter your location manually.");
            break;
          case error.POSITION_UNAVAILABLE:
            reject("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            reject("Location request timed out.");
            break;
          default:
            reject("An unknown error occurred while getting location.");
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // cache for 5 minutes
      }
    );
  });
}

/**
 * Reverse-geocodes coordinates using OpenStreetMap Nominatim.
 * - Free, no API key required.
 * - Rate-limited to 1 req/sec — fine for one-off onboarding calls.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<ReverseGeoResult> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=16`;

  const response = await fetch(url, {
    headers: {
      // Nominatim requires a valid User-Agent
      "User-Agent": "FinSightAI/1.0 (onboarding-geolocation)",
    },
  });

  if (!response.ok) {
    throw new Error(`Reverse geocoding failed: ${response.statusText}`);
  }

  const data = await response.json();
  const address: NominatimAddress = data.address || {};

  // Extract the most granular neighbourhood-level name available
  const neighbourhood =
    address.neighbourhood ||
    address.suburb ||
    address.quarter ||
    address.city_district ||
    address.village ||
    address.hamlet ||
    null;

  const city =
    address.city ||
    address.town ||
    address.municipality ||
    null;

  const state =
    address.state ||
    address.state_district ||
    null;

  return {
    neighbourhood,
    city,
    state,
    country: address.country || null,
    countryCode: address.country_code?.toUpperCase() || null,
    displayName: data.display_name || "",
  };
}

/**
 * Convenience function: gets browser location + reverse geocodes in one call.
 */
export async function detectUserLocation(): Promise<ReverseGeoResult> {
  const coords = await getBrowserLocation();
  return reverseGeocode(coords.latitude, coords.longitude);
}
