import { apiClient, ApiEnvelope } from '../../../app/api/apiClient';

export interface GeocodingSearchResult {
  id: string;
  provider: 'google' | 'nominatim' | 'photon';
  placeId?: string;
  displayName: string;
  name: string;
  formattedAddress: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface GeocodingApiResponse {
  provider: string;
  results: GeocodingSearchResult[];
}

export const geocodingService = {
  searchLocations: async (
    query: string,
    signal?: AbortSignal
  ): Promise<ApiEnvelope<GeocodingApiResponse>> => {
    return apiClient.get('/geocoding/search', {
      params: { q: query },
      signal,
    }) as unknown as Promise<ApiEnvelope<GeocodingApiResponse>>;
  },
};
