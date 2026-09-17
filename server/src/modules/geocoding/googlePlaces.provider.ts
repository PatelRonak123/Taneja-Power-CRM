import { env } from '../../config/env.js';
import { NormalizedLocationResult } from './geocoding.types.js';

/**
 * Google Maps / Places Geocoding Provider
 * Primary provider for address search with India country restriction and Vadodara location biasing.
 */
export class GooglePlacesProvider {
  private get apiKey(): string | undefined {
    return env.GOOGLE_MAPS_API_KEY;
  }

  public isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  public async search(query: string, limit = 5): Promise<NormalizedLocationResult[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      // 1. Try Google Geocoding API with India country restriction & Vadodara location bias
      const encodedQuery = encodeURIComponent(query);
      const boundsBias = '&bounds=22.15,73.05|22.45,73.30'; // Vadodara region bias
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedQuery}&components=country:IN${boundsBias}&key=${this.apiKey}`;

      const res = await fetch(geocodeUrl, {
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        console.warn(`[GooglePlacesProvider] Geocode HTTP error: ${res.status}`);
        return [];
      }

      const data = (await res.json()) as any;

      if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
        return this.parseGeocodeResults(data.results.slice(0, limit), query);
      }

      // 2. Fallback to Google Places TextSearch if Geocode returns ZERO_RESULTS
      if (data.status === 'ZERO_RESULTS' || !data.results || data.results.length === 0) {
        const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodedQuery}&location=22.3072,73.1812&radius=50000&region=in&key=${this.apiKey}`;
        const tsRes = await fetch(textSearchUrl, { headers: { Accept: 'application/json' } });
        if (tsRes.ok) {
          const tsData = (await tsRes.json()) as any;
          if (tsData.status === 'OK' && Array.isArray(tsData.results)) {
            return this.parseTextSearchResults(tsData.results.slice(0, limit), query);
          }
        }
      }

      return [];
    } catch (err) {
      console.error('[GooglePlacesProvider] Failed to fetch Google Geocoding:', err);
      return [];
    }
  }

  private parseGeocodeResults(results: any[], rawQuery: string): NormalizedLocationResult[] {
    return results.map((item: any, idx: number) => {
      const components = item.address_components || [];
      let city = '';
      let state = '';
      let pincode = '';
      let country = 'India';

      for (const comp of components) {
        const types: string[] = comp.types || [];
        if (types.includes('locality')) {
          city = comp.long_name;
        } else if (!city && (types.includes('administrative_area_level_3') || types.includes('administrative_area_level_2'))) {
          city = comp.long_name;
        }

        if (types.includes('administrative_area_level_1')) {
          state = comp.long_name;
        }

        if (types.includes('postal_code')) {
          pincode = comp.long_name;
        }

        if (types.includes('country')) {
          country = comp.long_name;
        }
      }

      // If city is still blank, try finding Vadodara/Gujarat hints from formatted address
      if (!city && item.formatted_address?.toLowerCase().includes('vadodara')) {
        city = 'Vadodara';
      }

      const formatted = item.formatted_address || '';
      // Extract specific place name if available, else derive cleanly from first comma segment
      const firstSegment = formatted.split(',')[0]?.trim() || rawQuery;
      const name = item.name && item.name !== formatted ? item.name : firstSegment;

      return {
        id: item.place_id || `google_${idx}_${Date.now()}`,
        provider: 'google',
        placeId: item.place_id,
        displayName: formatted,
        name,
        formattedAddress: formatted,
        city,
        state,
        pincode,
        country,
        latitude: parseFloat(item.geometry?.location?.lat ?? 0),
        longitude: parseFloat(item.geometry?.location?.lng ?? 0),
      };
    });
  }

  private parseTextSearchResults(results: any[], rawQuery: string): NormalizedLocationResult[] {
    return results.map((item: any, idx: number) => {
      const formatted = item.formatted_address || item.name || '';
      
      // Basic address parsing from formatted address
      const parts = formatted.split(',').map((p: string) => p.trim());
      const city = parts.length > 2 ? parts[parts.length - 3] || 'Vadodara' : 'Vadodara';
      const state = parts.length > 1 ? parts[parts.length - 2] || 'Gujarat' : 'Gujarat';

      return {
        id: item.place_id || `google_ts_${idx}_${Date.now()}`,
        provider: 'google',
        placeId: item.place_id,
        displayName: `${item.name ? item.name + ', ' : ''}${formatted}`,
        name: item.name || parts[0] || rawQuery,
        formattedAddress: formatted,
        city: city.replace(/\d+/g, '').trim(),
        state: state.replace(/\d+/g, '').trim(),
        pincode: (formatted.match(/\b\d{6}\b/) || [''])[0],
        country: 'India',
        latitude: parseFloat(item.geometry?.location?.lat ?? 0),
        longitude: parseFloat(item.geometry?.location?.lng ?? 0),
      };
    });
  }
}

export const googlePlacesProvider = new GooglePlacesProvider();
