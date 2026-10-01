import { env } from '../../config/env.js';
import { NormalizedLocationResult } from './geocoding.types.js';

/**
 * Google Places API (New) Provider
 * Primary provider for address search with India country restriction and Vadodara location biasing.
 * Uses Google Places API (New):
 * 1. Autocomplete (New): POST https://places.googleapis.com/v1/places:autocomplete + Place Details (New)
 * 2. Text Search (New): POST https://places.googleapis.com/v1/places:searchText
 * 3. Geocoding API: GET https://maps.googleapis.com/maps/api/geocode/json (Google Geocoding fallback)
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

    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    // Priority 1: Google Places Autocomplete (New) + Place Details (New)
    try {
      const autocompleteResults = await this.searchViaAutocomplete(trimmedQuery, limit);
      if (autocompleteResults.length > 0) {
        return autocompleteResults;
      }
    } catch (err) {
      console.warn('[GooglePlacesProvider] Autocomplete (New) attempt error:', err);
    }

    // Priority 2: Google Places Text Search (New)
    try {
      const textSearchResults = await this.searchViaTextSearch(trimmedQuery, limit);
      if (textSearchResults.length > 0) {
        return textSearchResults;
      }
    } catch (err) {
      console.warn('[GooglePlacesProvider] Text Search (New) attempt error:', err);
    }

    // Priority 3: Google Geocoding API (Separate Google geocoding fallback)
    try {
      const geocodeResults = await this.searchViaGeocoding(trimmedQuery, limit);
      if (geocodeResults.length > 0) {
        return geocodeResults;
      }
    } catch (err) {
      console.warn('[GooglePlacesProvider] Geocoding attempt error:', err);
    }

    return [];
  }

  /**
   * Search via Google Places API (New) Autocomplete
   * POST https://places.googleapis.com/v1/places:autocomplete
   */
  private async searchViaAutocomplete(query: string, limit: number): Promise<NormalizedLocationResult[]> {
    const url = 'https://places.googleapis.com/v1/places:autocomplete';

    const requestBody = {
      input: query,
      includedRegionCodes: ['IN'],
      locationBias: {
        circle: {
          center: {
            latitude: 22.3072,
            longitude: 73.1812,
          },
          radius: 50000.0,
        },
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey!,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(3500),
    });

    if (!res.ok) {
      const errData = (await res.json().catch(() => null)) as any;
      const errStatus = errData?.error?.status || res.status;
      const errMsg = errData?.error?.message || res.statusText;
      console.warn(`[GooglePlacesProvider] Autocomplete (New) notice: ${errStatus} - ${errMsg}`);
      return [];
    }

    const data = (await res.json()) as any;
    const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];

    if (env.isDevelopment) {
      console.log(`[GooglePlacesProvider] API: Autocomplete (New)`);
      console.log(`[GooglePlacesProvider] Query: ${query}`);
      console.log(`[GooglePlacesProvider] Results: ${suggestions.length}`);
    }

    if (suggestions.length === 0) {
      return [];
    }

    const topPredictions = suggestions.slice(0, limit);

    // Fetch details for each prediction in parallel via Place Details (New)
    const detailPromises = topPredictions.map(
      async (suggestion: any, idx: number): Promise<NormalizedLocationResult | null> => {
        const pred = suggestion.placePrediction;
        if (!pred) return null;

        const rawPlace = pred.place || '';
        const placeId = pred.placeId || (rawPlace.startsWith('places/') ? rawPlace.replace('places/', '') : rawPlace);

        if (placeId) {
          const detailed = await this.getPlaceDetails(placeId);
          if (detailed) {
            return detailed;
          }
        }

        // Fallback if Place Details fails for single item
        return this.createFallbackResultFromPrediction(pred, idx, query);
      }
    );

    const resolved = await Promise.all(detailPromises);
    return resolved.filter(
      (r): r is NormalizedLocationResult => r !== null && (r.latitude !== 0 || r.longitude !== 0)
    );
  }

  /**
   * Search via Google Places API (New) Text Search
   * POST https://places.googleapis.com/v1/places:searchText
   */
  private async searchViaTextSearch(query: string, limit: number): Promise<NormalizedLocationResult[]> {
    const url = 'https://places.googleapis.com/v1/places:searchText';

    const requestBody = {
      textQuery: query,
      regionCode: 'IN',
      locationBias: {
        circle: {
          center: {
            latitude: 22.3072,
            longitude: 73.1812,
          },
          radius: 50000.0,
        },
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey!,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(3500),
    });

    if (!res.ok) {
      const errData = (await res.json().catch(() => null)) as any;
      const errStatus = errData?.error?.status || res.status;
      const errMsg = errData?.error?.message || res.statusText;
      console.warn(`[GooglePlacesProvider] Text Search (New) notice: ${errStatus} - ${errMsg}`);
      return [];
    }

    const data = (await res.json()) as any;
    const places = Array.isArray(data.places) ? data.places : [];

    if (env.isDevelopment) {
      console.log(`[GooglePlacesProvider] API: Text Search (New)`);
      console.log(`[GooglePlacesProvider] Query: ${query}`);
      console.log(`[GooglePlacesProvider] Results: ${places.length}`);
    }

    if (places.length === 0) {
      return [];
    }

    return places.slice(0, limit).map((item: any, idx: number): NormalizedLocationResult => {
      const { city, state, pincode, country } = this.extractAddressComponents(item.addressComponents || []);
      const displayName =
        typeof item.displayName === 'object' ? item.displayName?.text : item.displayName || '';
      const formatted = item.formattedAddress || displayName || '';
      const firstSegment = formatted.split(',')[0]?.trim() || query;
      const name = displayName || firstSegment;

      return {
        id: item.id || `google_new_ts_${idx}_${Date.now()}`,
        provider: 'google',
        placeId: item.id,
        displayName: formatted || displayName,
        name,
        formattedAddress: formatted,
        city: city || (formatted.toLowerCase().includes('vadodara') ? 'Vadodara' : ''),
        state: state || (formatted.toLowerCase().includes('gujarat') ? 'Gujarat' : ''),
        pincode: pincode || (formatted.match(/\b\d{6}\b/) || [''])[0],
        country: country || 'India',
        latitude: parseFloat(item.location?.latitude ?? 0),
        longitude: parseFloat(item.location?.longitude ?? 0),
      };
    });
  }

  /**
   * Fetch details for a Place ID via Place Details (New)
   * GET https://places.googleapis.com/v1/places/{PLACE_ID}
   */
  public async getPlaceDetails(placeId: string): Promise<NormalizedLocationResult | null> {
    if (!this.isAvailable()) return null;

    try {
      const cleanPlaceId = placeId.startsWith('places/') ? placeId.replace('places/', '') : placeId;
      const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(cleanPlaceId)}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey!,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,addressComponents',
        },
        signal: AbortSignal.timeout(3000),
      });

      if (!res.ok) {
        return null;
      }

      const data = (await res.json()) as any;
      if (!data || !data.id) return null;

      const { city, state, pincode, country } = this.extractAddressComponents(data.addressComponents || []);
      const displayName =
        typeof data.displayName === 'object' ? data.displayName?.text : data.displayName || '';
      const formatted = data.formattedAddress || displayName || '';
      const firstSegment = formatted.split(',')[0]?.trim() || '';
      const name = displayName || firstSegment;

      return {
        id: data.id,
        provider: 'google',
        placeId: data.id,
        displayName: formatted || displayName,
        name,
        formattedAddress: formatted,
        city: city || (formatted.toLowerCase().includes('vadodara') ? 'Vadodara' : ''),
        state: state || (formatted.toLowerCase().includes('gujarat') ? 'Gujarat' : ''),
        pincode: pincode || (formatted.match(/\b\d{6}\b/) || [''])[0],
        country: country || 'India',
        latitude: parseFloat(data.location?.latitude ?? 0),
        longitude: parseFloat(data.location?.longitude ?? 0),
      };
    } catch {
      return null;
    }
  }

  /**
   * Search via Google Geocoding API (Separate Google fallback mechanism)
   * GET https://maps.googleapis.com/maps/api/geocode/json
   */
  private async searchViaGeocoding(query: string, limit: number): Promise<NormalizedLocationResult[]> {
    const encodedQuery = encodeURIComponent(query);
    const boundsBias = '&bounds=22.15,73.05|22.45,73.30'; // Vadodara region bias
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedQuery}&components=country:IN${boundsBias}&key=${this.apiKey}`;

    const res = await fetch(geocodeUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return [];

    const data = (await res.json()) as any;
    if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
      if (data.error_message) {
        console.warn(`[GooglePlacesProvider] Geocode notice: ${data.status} - ${data.error_message}`);
      }
      return [];
    }

    if (env.isDevelopment) {
      console.log(`[GooglePlacesProvider] API: Google Geocoding`);
      console.log(`[GooglePlacesProvider] Query: ${query}`);
      console.log(`[GooglePlacesProvider] Results: ${data.results.length}`);
    }

    return data.results.slice(0, limit).map((item: any, idx: number): NormalizedLocationResult => {
      const { city, state, pincode, country } = this.extractAddressComponents(item.address_components || []);
      const formatted = item.formatted_address || '';
      const firstSegment = formatted.split(',')[0]?.trim() || query;
      const name = item.name && item.name !== formatted ? item.name : firstSegment;

      return {
        id: item.place_id || `google_geo_${idx}_${Date.now()}`,
        provider: 'google',
        placeId: item.place_id,
        displayName: formatted,
        name,
        formattedAddress: formatted,
        city: city || (formatted.toLowerCase().includes('vadodara') ? 'Vadodara' : ''),
        state: state || (formatted.toLowerCase().includes('gujarat') ? 'Gujarat' : ''),
        pincode,
        country: country || 'India',
        latitude: parseFloat(item.geometry?.location?.lat ?? 0),
        longitude: parseFloat(item.geometry?.location?.lng ?? 0),
      };
    });
  }

  /**
   * Universal component extractor supporting both Places API (New) and Geocoding API format
   */
  private extractAddressComponents(components: any[]): { city: string; state: string; pincode: string; country: string } {
    let city = '';
    let state = '';
    let pincode = '';
    let country = 'India';

    for (const comp of components) {
      const types: string[] = comp.types || [];
      const text = comp.longText || comp.long_name || comp.shortText || comp.short_name || '';

      if (types.includes('locality')) {
        city = text;
      } else if (!city && (types.includes('administrative_area_level_3') || types.includes('administrative_area_level_2'))) {
        city = text;
      }

      if (types.includes('administrative_area_level_1')) {
        state = text;
      }

      if (types.includes('postal_code')) {
        pincode = text;
      }

      if (types.includes('country')) {
        country = text;
      }
    }

    return { city, state, pincode, country };
  }

  private createFallbackResultFromPrediction(pred: any, idx: number, rawQuery: string): NormalizedLocationResult {
    const rawPlace = pred.place || '';
    const placeId = pred.placeId || (rawPlace.startsWith('places/') ? rawPlace.replace('places/', '') : rawPlace);
    const mainText = pred.structuredFormat?.mainText?.text || rawQuery;
    const secondaryText = pred.structuredFormat?.secondaryText?.text || '';
    const fullText = pred.text?.text || `${mainText}${secondaryText ? ', ' + secondaryText : ''}`;

    return {
      id: placeId || `google_pred_${idx}_${Date.now()}`,
      provider: 'google',
      placeId: placeId || undefined,
      displayName: fullText,
      name: mainText,
      formattedAddress: fullText,
      city: secondaryText.includes('Vadodara') ? 'Vadodara' : '',
      state: secondaryText.includes('Gujarat') ? 'Gujarat' : '',
      pincode: (fullText.match(/\b\d{6}\b/) || [''])[0],
      country: 'India',
      latitude: 22.3072,
      longitude: 73.1812,
    };
  }
}

export const googlePlacesProvider = new GooglePlacesProvider();
