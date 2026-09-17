import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Radio,
  RefreshCw,
  MapPin,
  Navigation,
  User,
  Phone,
  Building2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { TaskItem } from '../types/task.types';
import { taskService } from '../services/taskService';

interface LiveRouteTrackingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedTaskId?: string | null;
}

function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const LiveRouteTrackingDrawer: React.FC<LiveRouteTrackingDrawerProps> = ({
  isOpen,
  onClose,
  initialSelectedTaskId,
}) => {
  const [activeTasks, setActiveTasks] = useState<TaskItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const fetchActiveTracking = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await taskService.getActiveTracking();
      if (response.success && Array.isArray(response.data)) {
        setActiveTasks(response.data);
        if (!selectedTaskId && response.data.length > 0) {
          setSelectedTaskId(response.data[0].id);
        }
      }
      setLastRefreshedAt(new Date());
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch live tracking telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialSelectedTaskId) {
        setSelectedTaskId(initialSelectedTaskId);
      }
      fetchActiveTracking();
    }
  }, [isOpen, initialSelectedTaskId]);

  // Polling interval (every 10 seconds while open and auto-refresh is active)
  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    const interval = setInterval(() => {
      fetchActiveTracking();
    }, 10000);

    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, selectedTaskId]);

  if (!isOpen) return null;

  const selectedTask =
    activeTasks.find((t) => t.id === selectedTaskId) || activeTasks[0] || null;

  // Calculate telemetry age
  let isStale = false;
  let elapsedMinutes = 0;
  if (selectedTask?.lastLocationUpdatedAt) {
    const lastUpdate = new Date(selectedTask.lastLocationUpdatedAt).getTime();
    const now = new Date().getTime();
    elapsedMinutes = Math.floor((now - lastUpdate) / (1000 * 60));
    isStale = elapsedMinutes >= 2;
  }

  // Calculate distance if coordinates exist
  let distanceKm: number | null = null;
  if (
    selectedTask?.currentLatitude &&
    selectedTask?.currentLongitude &&
    selectedTask?.destination?.latitude &&
    selectedTask?.destination?.longitude
  ) {
    const curLat = parseFloat(selectedTask.currentLatitude);
    const curLng = parseFloat(selectedTask.currentLongitude);
    const destLat = parseFloat(selectedTask.destination.latitude);
    const destLng = parseFloat(selectedTask.destination.longitude);
    if (!isNaN(curLat) && !isNaN(curLng) && !isNaN(destLat) && !isNaN(destLng)) {
      distanceKm = calculateDistanceKm(curLat, curLng, destLat, destLng);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden select-none">
      {/* Clickable Overlay Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in cursor-pointer"
        onClick={onClose}
      />

      {/* Slide-Over Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-[100]">
        <div
          className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-in-right overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sticky Drawer Header */}
          <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 shrink-0">
                <Radio size={20} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold tracking-tight">
                    Admin Live Route Dispatch Monitoring
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {activeTasks.length} Active Sessions
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time foreground GPS telemetry for in-progress work orders
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700/80 shrink-0 ml-3"
            >
              <X size={18} />
            </button>
          </div>

          {/* Action / Filter Bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-slate-50 text-xs">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={fetchActiveTracking}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-semibold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-600 font-medium">Auto-poll (10s)</span>
              </label>
            </div>

            <span className="text-slate-400 text-[11px]">
              Updated: {lastRefreshedAt.toLocaleTimeString()}
            </span>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Active Tasks Selector Chips */}
            {activeTasks.length > 0 ? (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select Active Work Order ({activeTasks.length})
                </span>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {activeTasks.map((t) => {
                    const isSelected = t.id === selectedTask?.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTaskId(t.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border text-left ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="truncate max-w-[180px]">{t.title}</div>
                        <div
                          className={`text-[10px] font-normal truncate max-w-[180px] mt-0.5 ${
                            isSelected ? 'text-blue-100' : 'text-slate-400'
                          }`}
                        >
                          {t.assignedUser?.fullName || 'Unassigned'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Radio size={32} className="mx-auto text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-700">No Active Field Tracking Sessions</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  There are currently no tasks in progress. When a sales engineer starts an assigned work order from the mobile app, live GPS telemetry will appear here automatically.
                </p>
              </div>
            )}

            {selectedTask && (
              <div className="flex flex-col gap-5">
                {/* Telemetry Status Banner */}
                <div
                  className={`p-4 rounded-2xl border flex flex-col gap-2 ${
                    isStale
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isStale ? (
                        <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                      ) : (
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      )}
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {isStale
                          ? `Telemetry Stale (Last updated ${elapsedMinutes} mins ago)`
                          : 'Live Telemetry Active & Verified'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/80 border border-current">
                      IN PROGRESS
                    </span>
                  </div>

                  <p className="text-xs opacity-90 leading-relaxed">
                    {isStale
                      ? 'The employee may be in an area with poor GPS coverage or the device may have delayed location dispatch.'
                      : 'Real-time telemetry coordinates are streaming from the employee mobile device.'}
                  </p>
                </div>

                {/* Live Coordinates & Map Overview Card */}
                <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col gap-4 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Navigation size={16} className="text-orange-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Live Telemetry & Route Coordinates
                      </span>
                    </div>
                    {selectedTask.currentLatitude && selectedTask.currentLongitude && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&origin=${selectedTask.currentLatitude},${selectedTask.currentLongitude}&destination=${selectedTask.destination?.latitude || ''},${selectedTask.destination?.longitude || ''}&travelmode=driving`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-400 hover:text-orange-300"
                      >
                        <span>Open Satellite Map</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>

                  {/* Coordinates Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Engineer Live GPS Position
                      </span>
                      {selectedTask.currentLatitude && selectedTask.currentLongitude ? (
                        <div>
                          <div className="text-sm font-mono font-bold text-emerald-400">
                            {parseFloat(selectedTask.currentLatitude).toFixed(5)}°, {parseFloat(selectedTask.currentLongitude).toFixed(5)}°
                          </div>
                          {selectedTask.locationAccuracy && (
                            <div className="text-[10px] text-slate-400 mt-1">
                              Accuracy: ±{Math.round(parseFloat(selectedTask.locationAccuracy))}m
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No GPS coordinates yet</span>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Destination Target Site
                      </span>
                      {selectedTask.destination?.latitude && selectedTask.destination?.longitude ? (
                        <div>
                          <div className="text-sm font-mono font-bold text-blue-400">
                            {parseFloat(selectedTask.destination.latitude).toFixed(5)}°, {parseFloat(selectedTask.destination.longitude).toFixed(5)}°
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 truncate">
                            {selectedTask.destination.name}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Target coordinates not registered</span>
                      )}
                    </div>
                  </div>

                  {/* Distance & Route Estimate */}
                  {distanceKm !== null && (
                    <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-orange-400" />
                        <span className="text-xs text-slate-300 font-medium">Straight-Line Distance to Site:</span>
                      </div>
                      <span className="text-sm font-bold text-orange-400">
                        {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} meters` : `${distanceKm.toFixed(2)} km`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Engineer & Customer Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Engineer Card */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <User size={14} className="text-blue-600" />
                      <span>Assigned Field Engineer</span>
                    </div>
                    {selectedTask.assignedUser ? (
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {selectedTask.assignedUser.fullName}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {selectedTask.assignedUser.designation || 'Field Service Engineer'}
                        </p>
                        {selectedTask.assignedUser.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium mt-2">
                            <Phone size={13} />
                            <a href={`tel:${selectedTask.assignedUser.phone}`}>
                              {selectedTask.assignedUser.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Unassigned</span>
                    )}
                  </div>

                  {/* Destination Site Card */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <Building2 size={14} className="text-blue-600" />
                      <span>Customer & Site Destination</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {selectedTask.customer?.companyName || selectedTask.customer?.name || 'Customer'}
                      </h4>
                      {selectedTask.destination && (
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          <strong className="text-slate-700">{selectedTask.destination.name}:</strong>{' '}
                          {selectedTask.destination.address ? `${selectedTask.destination.address}, ` : ''}
                          {selectedTask.destination.city || ''} {selectedTask.destination.state || ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Timeline Card */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <Clock size={14} className="text-blue-600" />
                    <span>Work Order Timeline</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-1 text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Scheduled:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedTask.scheduledAt ? new Date(selectedTask.scheduledAt).toLocaleString() : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Started At:</span>
                      <span className="font-semibold text-emerald-700">
                        {selectedTask.startedAt ? new Date(selectedTask.startedAt).toLocaleString() : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 sticky bottom-0">
            <div className="flex items-center gap-1.5">
              <Shield size={14} className="text-slate-400" />
              <span>Encrypted Admin telemetry channel</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-all cursor-pointer"
            >
              Close Monitor
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
