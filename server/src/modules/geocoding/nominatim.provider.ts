import { NormalizedLocationResult } from './geocoding.types.js';

/**
 * OpenStreetMap Nominatim Geocoding Provider (Fallback 1)
 */
export class NominatimProvider {
  public async search(query: string, limit = 5): Promise<NormalizedLocationResult[]> {
    try {
      const q = encodeURIComponent(query);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${q}&addressdetails=1&countrycodes=in&limit=${limit}`;

      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'TanejaPowerCRM-GeocodingService/1.0',
        },
      });

      if (!res.ok) {
        console.warn(`[NominatimProvider] HTTP error: ${res.status}`);
        return [];
      }

      const data = (await res.json()) as any[];
      if (!Array.isArray(data)) return [];

      return data.map((item: any, idx: number) => {
        const addr = item.address || {};
        const city =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.municipality ||
          addr.suburb ||
          addr.county ||
          addr.district ||
          '';
        const state = addr.state || addr.region || '';
        const pincode = addr.postcode || '';
        const country = addr.country || 'India';
        const displayName = item.display_name || '';

        // Extract clean name from display name or address components
        const firstSegment = displayName.split(',')[0]?.trim() || query;

        return {
          id: `nominatim_${item.place_id || idx}_${Date.now()}`,
          provider: 'nominatim',
          displayName,
          name: addr.building || addr.amenity || addr.road || firstSegment,
          formattedAddress: displayName,
          city,
          state,
          pincode,
          country,
          latitude: parseFloat(item.lat ?? 0),
          longitude: parseFloat(item.lon ?? 0),
        };
      });
    } catch (err) {
      console.error('[NominatimProvider] Search error:', err);
      return [];
    }
  }
}

export const nominatimProvider = new NominatimProvider();
