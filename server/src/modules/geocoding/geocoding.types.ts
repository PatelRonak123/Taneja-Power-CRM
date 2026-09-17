export type GeocodingProviderType = 'google' | 'nominatim' | 'photon';

export interface NormalizedLocationResult {
  id: string;
  provider: GeocodingProviderType;
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

export interface GeocodingSearchOptions {
  query: string;
  limit?: number;
}
