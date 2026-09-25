import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  X,
  AlertCircle,
  Phone,
  User as UserIcon,
  Navigation,
  Search,
  RefreshCw,
  CheckCircle2,
  Globe,
  ChevronDown,
  ChevronUp,
  Map as MapIcon,
  ExternalLink,
} from 'lucide-react';
import { DestinationStatus } from '../types/customer.types';
import { geocodingService } from '../services/geocodingService';
import { Drawer } from '../../../components/ui/Drawer';
import { Button } from '../../../components/ui/Button';

export interface AddressSuggestionItem {
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
  latitude: number | string;
  longitude: number | string;
}

interface DestinationModalProps {
  modalMode: 'create' | 'edit' | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    latitude: string;
    longitude: string;
    placeId?: string;
    contactPerson: string;
    contactPhone: string;
    notes: string;
    status: DestinationStatus;
  };
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
  onSelectAddressSuggestion?: (suggestion: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    latitude: string;
    longitude: string;
    placeId?: string;
    name?: string;
  }) => void;
  formSubmitting: boolean;
  formError: string | null;
}

export const DestinationModal: React.FC<DestinationModalProps> = ({
  modalMode,
  isOpen,
  onClose,
  onSubmit,
  formData,
  onInputChange,
  onSelectAddressSuggestion,
  formSubmitting,
  formError,
}) => {
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestionItem[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState<boolean>(false);
  const [searchProvider, setSearchProvider] = useState<string>('google');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showAddressDropdown, setShowAddressDropdown] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [autoPopulatedBadge, setAutoPopulatedBadge] = useState<boolean>(false);
  const [showAdvancedLocation, setShowAdvancedLocation] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Perform debounced geocoding search via backend API with abort control
  const executeLocationSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 3) {
      setAddressSuggestions([]);
      setShowAddressDropdown(false);
      setSearchError(null);
      return;
    }

    // Abort active in-flight request to prevent race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearchingAddress(true);
    setSearchError(null);

    try {
      const response = await geocodingService.searchLocations(trimmed, controller.signal);
      if (response.success && response.data) {
        const results = response.data.results || [];
        setSearchProvider(response.data.provider || 'google');
        setAddressSuggestions(results);
        setShowAddressDropdown(true);
        setHighlightedIndex(-1);
      } else {
        setAddressSuggestions([]);
        setShowAddressDropdown(true);
      }
    } catch (err: any) {
      if (
        err?.name === 'CanceledError' ||
        err?.name === 'AbortError' ||
        err?.code === 'ERR_CANCELED' ||
        err?.message === 'canceled' ||
        (typeof err?.message === 'string' && err.message.toLowerCase().includes('cancel'))
      ) {
        return; // Ignore aborted requests
      }
      console.error('[DestinationModal] Geocoding error:', err);
      setSearchError('Location search temporarily unavailable. You can enter details manually.');
      setAddressSuggestions([]);
      setShowAddressDropdown(true);
    } finally {
      setIsSearchingAddress(false);
    }
  }, []);

  // Debounce address input changes
  useEffect(() => {
    if (!formData.address || formData.address.trim().length < 3) {
      setAddressSuggestions([]);
      setShowAddressDropdown(false);
      return;
    }

    const timer = setTimeout(() => {
      executeLocationSearch(formData.address);
    }, 350);

    return () => {
      clearTimeout(timer);
    };
  }, [formData.address, executeLocationSearch]);

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAddressDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Keyboard Navigation in Suggestions Dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showAddressDropdown || addressSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < addressSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : addressSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < addressSuggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(addressSuggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowAddressDropdown(false);
    }
  };

  const handleSelectSuggestion = (suggestion: AddressSuggestionItem) => {
    const latStr = suggestion.latitude ? suggestion.latitude.toString() : '';
    const lngStr = suggestion.longitude ? suggestion.longitude.toString() : '';

    if (onSelectAddressSuggestion) {
      onSelectAddressSuggestion({
        name: suggestion.name,
        address: suggestion.formattedAddress || suggestion.displayName,
        city: suggestion.city,
        state: suggestion.state,
        pincode: suggestion.pincode,
        latitude: latStr,
        longitude: lngStr,
        placeId: suggestion.placeId,
      });
    }

    setShowAddressDropdown(false);
    setAutoPopulatedBadge(true);
    setTimeout(() => setAutoPopulatedBadge(false), 5000);
  };

  if (!isOpen || !modalMode) return null;

  const hasValidCoordinates =
    formData.latitude &&
    formData.longitude &&
    !isNaN(parseFloat(formData.latitude)) &&
    !isNaN(parseFloat(formData.longitude));

  const latNum = hasValidCoordinates ? parseFloat(formData.latitude) : 0;
  const lngNum = hasValidCoordinates ? parseFloat(formData.longitude) : 0;

  // OpenStreetMap embed bbox calculation for interactive map preview
  const mapBbox = hasValidCoordinates
    ? `${lngNum - 0.005},${latNum - 0.005},${lngNum + 0.005},${latNum + 0.005}`
    : '';
  const mapEmbedUrl = hasValidCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${mapBbox}&layer=mapnik&marker=${latNum},${lngNum}`
    : '';

  const drawerTitle = (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
        <MapPin size={16} />
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-900 leading-snug">
          {modalMode === 'create' ? 'Register Destination Site' : 'Edit Destination Site'}
        </h3>
        <p className="text-xs text-slate-500 font-normal">
          Google Maps address search & GPS facility management
        </p>
      </div>
    </div>
  );

  const drawerFooter = (
    <div className="flex items-center justify-end gap-2 w-full">
      <Button
        variant="outline"
        size="md"
        onClick={onClose}
        disabled={formSubmitting}
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        size="md"
        type="submit"
        isLoading={formSubmitting}
        onClick={onSubmit}
      >
        {modalMode === 'create' ? 'Add Destination Site' : 'Save Changes'}
      </Button>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={drawerTitle}
      maxWidth="xl"
      footer={drawerFooter}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{formError}</span>
          </div>
        )}

              {/* 1. Facility Address with Google Maps Autocomplete */}
              <div className="relative" ref={dropdownRef}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Destination Address <span className="text-rose-500">*</span>
                  </label>
                  {autoPopulatedBadge && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 animate-in fade-in">
                      <CheckCircle2 size={12} className="text-emerald-600" /> Auto-populated
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    ref={addressInputRef}
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={(e) => {
                      onInputChange(e);
                      setShowAddressDropdown(true);
                    }}
                    onFocus={() => {
                      if (formData.address && formData.address.length >= 3) {
                        setShowAddressDropdown(true);
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search building, landmark or road (e.g. Dhyan Residency near Harni Water Tank...)"
                    className="w-full h-11 pl-10 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                  />

                  {isSearchingAddress ? (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <RefreshCw size={15} className="animate-spin text-indigo-600" />
                    </div>
                  ) : formData.address ? (
                    <button
                      type="button"
                      onClick={() => {
                        onInputChange({
                          target: { name: 'address', value: '' },
                        } as any);
                        setAddressSuggestions([]);
                        setShowAddressDropdown(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  ) : null}
                </div>

                {/* Suggestions Dropdown */}
                {showAddressDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5 text-indigo-700">
                        <Globe size={13} className="text-indigo-600" />
                        <span>
                          {searchProvider === 'google' ? 'Google Maps Suggestions' : 'Map Suggestions'}{' '}
                          ({addressSuggestions.length})
                        </span>
                      </div>
                      <span className="text-slate-400 font-normal">India Only</span>
                    </div>

                    {isSearchingAddress && addressSuggestions.length === 0 && (
                      <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                        <RefreshCw size={14} className="animate-spin text-indigo-600" />
                        <span>Searching locations in India...</span>
                      </div>
                    )}

                    {!isSearchingAddress && searchError && (
                      <div className="p-4 text-center text-xs text-rose-600 bg-rose-50/50">
                        {searchError}
                      </div>
                    )}

                    {!isSearchingAddress && !searchError && addressSuggestions.length === 0 && (
                      <div className="p-6 text-center text-xs text-slate-500">
                        <p className="font-semibold text-slate-700">No locations found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Try searching by landmark, area name, or city (e.g. "Harni Vadodara")
                        </p>
                      </div>
                    )}

                    {addressSuggestions.map((item, index) => {
                      const isHighlighted = index === highlightedIndex;
                      const isGoogle = item.provider === 'google';

                      return (
                        <div
                          key={item.id || index}
                          onClick={() => handleSelectSuggestion(item)}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 group ${
                            isHighlighted ? 'bg-indigo-50/90' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              isGoogle
                                ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'
                                : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                            }`}
                          >
                            <MapPin size={15} />
                          </div>

                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-black text-slate-900 leading-snug truncate">
                                {item.name || item.displayName.split(',')[0]}
                              </span>
                              <span
                                className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                                  isGoogle
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                }`}
                              >
                                {item.provider}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                              {item.formattedAddress || item.displayName}
                            </p>

                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-medium">
                              {item.city && (
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                  {item.city}
                                </span>
                              )}
                              {item.state && <span>{item.state}</span>}
                              {item.pincode && <span>• Pincode: {item.pincode}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Destination / Facility Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Destination / Facility Name <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Business or site name</span>
                </div>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={onInputChange}
                    required
                    placeholder="e.g. Dhyan Residency / Turbine Unit 4"
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                  />
                </div>
              </div>

              {/* 3. Interactive Map Preview Component */}
              {hasValidCoordinates && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-xs animate-in fade-in duration-200">
                  <div className="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapIcon size={14} className="text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800">Selected Location Preview</span>
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${latNum},${lngNum}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                    >
                      <span>Open Google Maps</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  {/* Leaflet/OSM Iframe Map */}
                  <div className="h-40 w-full relative bg-slate-200">
                    <iframe
                      title="Location Map Preview"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight={0}
                      marginWidth={0}
                      src={mapEmbedUrl}
                      className="w-full h-full border-0 pointer-events-none"
                    />
                    <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200/80 text-[10px] font-mono font-bold text-slate-700 shadow-xs">
                      📍 {latNum.toFixed(6)}, {lngNum.toFixed(6)}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. City, State, Pincode */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={onInputChange}
                    placeholder="e.g. Vadodara"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">State</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={onInputChange}
                    placeholder="e.g. Gujarat"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Pincode</label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={onInputChange}
                    placeholder="e.g. 390022"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>
              </div>

              {/* 5. Contact Person, Phone, Site Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Site Contact</label>
                  <div className="relative">
                    <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="contactPerson"
                      value={formData.contactPerson}
                      onChange={onInputChange}
                      placeholder="In-charge name"
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Site Phone</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="contactPhone"
                      value={formData.contactPhone}
                      onChange={onInputChange}
                      placeholder="+91 98980 12345"
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Site Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={onInputChange}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              {/* 6. Access Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Access Instructions & Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  value={formData.notes}
                  onChange={onInputChange}
                  placeholder="Gate pass requirements, landmark directions, safety clearance..."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
                />
              </div>

              {/* 7. Collapsible Advanced Location Details (Coordinates & Google Place ID) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setShowAdvancedLocation(!showAdvancedLocation)}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 flex items-center justify-between hover:bg-slate-100/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Navigation size={14} className="text-indigo-600" />
                    <span>Advanced GPS & Technical Details</span>
                    {hasValidCoordinates && (
                      <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        {latNum.toFixed(4)}, {lngNum.toFixed(4)}
                      </span>
                    )}
                  </div>
                  {showAdvancedLocation ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>

                {showAdvancedLocation && (
                  <div className="p-4 border-t border-slate-200 bg-white grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Latitude</label>
                      <input
                        type="text"
                        name="latitude"
                        value={formData.latitude}
                        onChange={onInputChange}
                        placeholder="e.g. 22.331200"
                        className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Longitude</label>
                      <input
                        type="text"
                        name="longitude"
                        value={formData.longitude}
                        onChange={onInputChange}
                        placeholder="e.g. 73.208900"
                        className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Google Place ID</label>
                      <input
                        type="text"
                        name="placeId"
                        value={formData.placeId || ''}
                        onChange={onInputChange}
                        placeholder="e.g. ChIJ..."
                        className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>
                )}
              </div>
      </form>
    </Drawer>
  );
};
