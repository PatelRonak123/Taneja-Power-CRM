import { NormalizedLocationResult } from './geocoding.types.js';

/**
 * Photon Komoot OpenStreetMap Geocoding Provider (Fallback 2)
 */
export class PhotonProvider {
  public async search(query: string, limit = 5): Promise<NormalizedLocationResult[]> {
    try {
      const q = encodeURIComponent(query);
      const url = `https://photon.komoot.io/api/?q=${q}&limit=${limit * 2}&lang=en`;

      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        console.warn(`[PhotonProvider] HTTP error: ${res.status}`);
        return [];
      }

      const data = (await res.json()) as any;
      if (!data || !Array.isArray(data.features)) return [];

      const inFeatures = data.features.filter((f: any) => {
        const props = f.properties || {};
        const cc = (props.countrycode || '').toLowerCase();
        const cName = (props.country || '').toLowerCase();
        return cc === 'in' || cName === 'india';
      }).slice(0, limit);

      return inFeatures.map((f: any, idx: number) => {
        const props = f.properties || {};
        const coords = f.geometry?.coordinates || [0, 0]; // [lon, lat]
        const labelParts = [
          props.name,
          props.street,
          props.district,
          props.city,
          props.state,
          props.postcode,
          'India',
        ].filter(Boolean);

        const displayName = labelParts.join(', ');
        const name = props.name || labelParts[0] || query;

        return {
          id: `photon_${props.osm_id || idx}_${Date.now()}`,
          provider: 'photon',
          displayName: displayName || name,
          name,
          formattedAddress: displayName || name,
          city: props.city || props.district || '',
          state: props.state || '',
          pincode: props.postcode || '',
          country: 'India',
          latitude: parseFloat(coords[1] ?? 0),
          longitude: parseFloat(coords[0] ?? 0),
        };
      });
    } catch (err) {
      console.error('[PhotonProvider] Search error:', err);
      return [];
    }
  }
}

export const photonProvider = new PhotonProvider();
