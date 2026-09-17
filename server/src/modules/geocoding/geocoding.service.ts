import { NormalizedLocationResult } from './geocoding.types.js';
import { googlePlacesProvider } from './googlePlaces.provider.js';
import { nominatimProvider } from './nominatim.provider.js';
import { photonProvider } from './photon.provider.js';

export class GeocodingService {
  /**
   * Remove common Indian landmark filler words for fallback query matching
   */
  public sanitizeQuery(query: string): string {
    return query
      .replace(/\b(near|opp|opposite|behind|next to|beside|adjacent to|nr\.|nr|landmark)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract landmark / area sub-query when informal building query returns 0 results
   * e.g. "Dhyan Residency near Harni water tank vadodara" -> "Harni water tank vadodara"
   */
  public extractLandmarkQuery(query: string): string | null {
    const match = query.match(/\b(?:near|opp|opposite|behind|next to|beside|adjacent to|nr\.|nr|landmark)\s+(.+)/i);
    if (match && match[1] && match[1].trim().length >= 3) {
      return match[1].trim();
    }

    // If query has commas e.g. "Dhyan Residency, Harni Water Tank, Vadodara"
    if (query.includes(',')) {
      const parts = query.split(',').map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return parts.slice(1).join(', ');
      }
    }

    // If query is long (>= 4 words), take the last 2-3 words (typically area + city)
    const words = query.trim().split(/\s+/);
    if (words.length >= 4) {
      return words.slice(-3).join(' ');
    }

    return null;
  }

  public async search(rawQuery: string): Promise<{ provider: string; results: NormalizedLocationResult[] }> {
    const trimmedQuery = rawQuery.trim();
    if (!trimmedQuery || trimmedQuery.length < 3) {
      return { provider: 'none', results: [] };
    }

    const sanitized = this.sanitizeQuery(trimmedQuery);

    // 1. Primary: Try Google Places Provider if configured
    if (googlePlacesProvider.isAvailable()) {
      try {
        const googleResults = await googlePlacesProvider.search(trimmedQuery);
        if (googleResults.length > 0) {
          return { provider: 'google', results: this.deduplicateAndValidate(googleResults) };
        }

        // If raw query returned no results, try sanitized query on Google
        if (sanitized && sanitized !== trimmedQuery) {
          const sanitizedGoogleResults = await googlePlacesProvider.search(sanitized);
          if (sanitizedGoogleResults.length > 0) {
            return { provider: 'google', results: this.deduplicateAndValidate(sanitizedGoogleResults) };
          }
        }

        // Try landmark sub-query on Google
        const landmarkQuery = this.extractLandmarkQuery(trimmedQuery);
        if (landmarkQuery) {
          const landmarkGoogleResults = await googlePlacesProvider.search(landmarkQuery);
          if (landmarkGoogleResults.length > 0) {
            return { provider: 'google', results: this.deduplicateAndValidate(landmarkGoogleResults) };
          }
        }
      } catch (err) {
        console.warn('[GeocodingService] Google provider failed, switching to fallbacks:', err);
      }
    }

    // 2. Fallback strategy: Nominatim -> Photon
    let fallbackResults: NormalizedLocationResult[] = [];
    let usedProvider = 'nominatim';

    // Tier A: Nominatim with sanitized query
    const searchTarget = sanitized.length >= 3 ? sanitized : trimmedQuery;
    fallbackResults = await nominatimProvider.search(searchTarget);

    // Tier B: Nominatim with raw query if sanitized gave no results
    if (fallbackResults.length === 0 && searchTarget !== trimmedQuery) {
      fallbackResults = await nominatimProvider.search(trimmedQuery);
    }

    // Tier C: Extract landmark/area sub-query if specific building string returned 0 results
    const landmarkSubQuery = this.extractLandmarkQuery(trimmedQuery);
    if (fallbackResults.length === 0 && landmarkSubQuery) {
      fallbackResults = await nominatimProvider.search(this.sanitizeQuery(landmarkSubQuery));
    }

    // Tier D: Try city fallback if still 0 results (e.g. last 2 words)
    if (fallbackResults.length === 0) {
      const words = trimmedQuery.split(/\s+/);
      if (words.length >= 2) {
        const cityAreaTarget = words.slice(-2).join(' ');
        if (cityAreaTarget !== searchTarget && cityAreaTarget !== landmarkSubQuery) {
          fallbackResults = await nominatimProvider.search(cityAreaTarget);
        }
      }
    }

    // Tier E: Photon provider as final fallback
    if (fallbackResults.length === 0) {
      fallbackResults = await photonProvider.search(searchTarget);
      if (fallbackResults.length === 0 && landmarkSubQuery) {
        fallbackResults = await photonProvider.search(landmarkSubQuery);
      }
      usedProvider = 'photon';
    }

    return {
      provider: usedProvider,
      results: this.deduplicateAndValidate(fallbackResults),
    };
  }

  private deduplicateAndValidate(results: NormalizedLocationResult[]): NormalizedLocationResult[] {
    const uniqueMap = new Map<string, NormalizedLocationResult>();

    for (const item of results) {
      // Validate lat/lng coordinates
      if (
        isNaN(item.latitude) ||
        isNaN(item.longitude) ||
        item.latitude < -90 ||
        item.latitude > 90 ||
        item.longitude < -180 ||
        item.longitude > 180
      ) {
        continue;
      }

      const key = item.placeId ? `pid_${item.placeId}` : `geo_${item.latitude.toFixed(5)}_${item.longitude.toFixed(5)}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    }

    return Array.from(uniqueMap.values());
  }
}

export const geocodingService = new GeocodingService();
