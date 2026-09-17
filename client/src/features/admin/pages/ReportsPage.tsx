import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Target, DollarSign,
  Activity, RefreshCw, BarChart2,
  AlertCircle, PieChart as PieIcon,
} from 'lucide-react';
import { leadsApi } from '../../leads/api/leadsApi';
import { Lead } from '../../leads/types/lead';

// ─── Colour palettes ─────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  New: '#6366f1',
  Contacted: '#3b82f6',
  'Meeting Scheduled': '#0ea5e9',
  'Proposal Sent': '#06b6d4',
  'Quotation Sent': '#14b8a6',
  Negotiation: '#f59e0b',
  NEGOTIATION: '#f59e0b',
  Approved: '#10b981',
  'APPROVED/PO': '#10b981',
  Installation: '#84cc16',
  'AMC Support': '#a78bfa',
  Completed: '#22c55e',
  COMPLETED: '#22c55e',
  Lost: '#ef4444',
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: '#94a3b8',
  Medium: '#3b82f6',
  High: '#f59e0b',
  Urgent: '#ef4444',
};

const SOURCE_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'];

// Monthly dummy trend (until real timestamps are exposed by backend)
const MONTHLY_TREND = [
  { month: 'Apr', leads: 8, value: 420000 },
  { month: 'May', leads: 14, value: 750000 },
  { month: 'Jun', leads: 11, value: 610000 },
  { month: 'Jul', leads: 19, value: 1050000 },
  { month: 'Aug', leads: 22, value: 1380000 },
  { month: 'Sep', leads: 17, value: 920000 },
];

// ─── Tooltip helpers ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl px-4 py-3 text-xs backdrop-blur-sm">
      {label && <p className="text-slate-300 font-semibold mb-1.5">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="text-white font-bold">
            {typeof p.value === 'number' && (p.name?.toLowerCase().includes('value') || p.name?.includes('₹'))
              ? `₹${p.value.toLocaleString()}`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl px-4 py-3 text-xs backdrop-blur-sm">
      <p className="text-white font-bold">{d.name}</p>
      <p className="text-slate-300">Count: <span className="text-white font-bold">{d.value}</span></p>
      <p className="text-slate-300">Share: <span className="text-white font-bold">{d.payload.percent}%</span></p>
    </div>
  );
};

// ─── Stat card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  colorClass: string;
}
const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon: Icon, trend, colorClass }) => (
  <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm p-4 flex items-start gap-3">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
      <Icon size={18} className="text-white" />
    </div>
    <div className="flex-1 min-w-0 overflow-hidden">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-tight truncate">{label}</p>
      <p className="text-xl font-black text-slate-900 tracking-tight mt-0.5 truncate">{value}</p>
      {sub && (
        <p className={`text-[11px] font-semibold mt-1 flex items-start gap-1 leading-snug ${
          trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-500' : 'text-slate-500'
        }`}>
          <span className="shrink-0 mt-0.5">
            {trend === 'up' && <TrendingUp size={11} />}
            {trend === 'down' && <TrendingDown size={11} />}
          </span>
          <span className="break-words min-w-0">{sub}</span>
        </p>
      )}
    </div>
    <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-10 ${colorClass}`} />
  </div>
);

// ─── Chart wrapper card ───────────────────────────────────────────────────────
const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
    <div className="px-6 pt-5 pb-3 border-b border-slate-100">
      <h3 className="text-sm font-black text-slate-900 tracking-tight">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
export const ReportsPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await leadsApi.getLeads();
      setLeads(Array.isArray(data) ? data : []);
      setLastRefreshed(new Date());
    } catch {
      setError('Could not load leads data from server. Showing cached data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, []);

  // ── Derived aggregations ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = leads.length;
    const totalValue = leads.reduce((s, l) => s + (Number(l.expectedValue) || 0), 0);
    const wonLeads = leads.filter(l =>
      ['Completed', 'COMPLETED', 'APPROVED/PO', 'Approved'].includes(l.status)
    );
    const lostLeads = leads.filter(l => l.status === 'Lost');
    const activeLeads = leads.filter(l => !['Completed', 'COMPLETED', 'Lost'].includes(l.status));
    const conversionRate = total ? Math.round((wonLeads.length / total) * 100) : 0;
    const avgValue = total ? Math.round(totalValue / total) : 0;
    return { total, totalValue, wonLeads, lostLeads, activeLeads, conversionRate, avgValue };
  }, [leads]);

  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach(l => {
      const key = l.status === 'NEGOTIATION' ? 'Negotiation'
        : l.status === 'COMPLETED' ? 'Completed' : l.status;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({
        name, value,
        percent: leads.length ? Math.round((value / leads.length) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [leads]);

  const priorityData = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    leads.forEach(l => {
      if (!map[l.priority]) map[l.priority] = { count: 0, value: 0 };
      map[l.priority].count++;
      map[l.priority].value += Number(l.expectedValue) || 0;
    });
    return Object.entries(map).map(([name, d]) => ({
      name,
      count: d.count,
      value: Math.round(d.value / 1000),
    }));
  }, [leads]);

  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach(l => { map[l.source] = (map[l.source] || 0) + 1; });
    return Object.entries(map).map(([name, value], i) => ({
      name, value,
      percent: leads.length ? Math.round((value / leads.length) * 100) : 0,
      color: SOURCE_COLORS[i % SOURCE_COLORS.length],
    }));
  }, [leads]);

  const executiveData = useMemo(() => {
    const map: Record<string, { leads: number; value: number; won: number }> = {};
    leads.forEach(l => {
      const exec = l.assignedExecutive || 'Unassigned';
      if (!map[exec]) map[exec] = { leads: 0, value: 0, won: 0 };
      map[exec].leads++;
      map[exec].value += Number(l.expectedValue) || 0;
      if (['Completed', 'COMPLETED', 'APPROVED/PO', 'Approved'].includes(l.status)) map[exec].won++;
    });
    return Object.entries(map)
      .map(([name, d]) => ({
        name: name.length > 14 ? name.slice(0, 13) + '\u2026' : name,
        fullName: name,
        leads: d.leads,
        value: Math.round(d.value / 1000),
        won: d.won,
        winRate: d.leads ? Math.round((d.won / d.leads) * 100) : 0,
      }))
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 6);
  }, [leads]);

  const radarData = useMemo(() => {
    const stages = ['New', 'Contacted', 'Proposal Sent', 'Negotiation', 'Completed', 'Lost'];
    return stages.map(s => ({
      status: s,
      count: leads.filter(l => l.status === s || l.status === s.toUpperCase()).length,
    }));
  }, [leads]);

  const valueBuckets = useMemo(() => {
    const buckets = [
      { label: '<50K', min: 0, max: 50000 },
      { label: '50K-2L', min: 50000, max: 200000 },
      { label: '2L-5L', min: 200000, max: 500000 },
      { label: '5L-10L', min: 500000, max: 1000000 },
      { label: '>10L', min: 1000000, max: Infinity },
    ];
    return buckets.map(b => ({
      label: b.label,
      count: leads.filter(l => {
        const v = Number(l.expectedValue) || 0;
        return v >= b.min && v < b.max;
      }).length,
    }));
  }, [leads]);

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 pb-12 max-w-7xl mx-auto">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200/60">
              <BarChart2 size={12} />
              ANALYTICS &amp; REPORTS
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">CRM Data Insights</h1>
          <p className="text-sm text-slate-500">
            Live aggregations from your leads database &middot; Last refreshed {lastRefreshed.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={fetchLeads}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-60 cursor-pointer shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Data
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 px-5 py-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-semibold">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Leads"
              value={stats.total}
              sub={`${stats.activeLeads.length} active in pipeline`}
              icon={Target}
              trend="up"
              colorClass="bg-gradient-to-br from-indigo-500 to-violet-600"
            />
            <StatCard
              label="Pipeline Value"
              value={`${(stats.totalValue / 100000).toFixed(1)}L`}
              sub={`Avg ${(stats.avgValue / 1000).toFixed(0)}K per lead`}
              icon={DollarSign}
              trend="up"
              colorClass="bg-gradient-to-br from-emerald-500 to-teal-600"
            />
            <StatCard
              label="Conversion Rate"
              value={`${stats.conversionRate}%`}
              sub={`${stats.wonLeads.length} leads won`}
              icon={TrendingUp}
              trend={stats.conversionRate > 20 ? 'up' : 'down'}
              colorClass="bg-gradient-to-br from-blue-500 to-cyan-600"
            />
            <StatCard
              label="Lost Leads"
              value={stats.lostLeads.length}
              sub={`${stats.total ? Math.round((stats.lostLeads.length / stats.total) * 100) : 0}% of total`}
              icon={Activity}
              trend="down"
              colorClass="bg-gradient-to-br from-rose-500 to-pink-600"
            />
          </div>

          {/* Row 1: Status Bar + Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <ChartCard
              title="Leads by Status"
              subtitle="Distribution across all pipeline stages"
              className="lg:col-span-3"
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={statusData} margin={{ left: -10, right: 4, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={55}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Leads" radius={[6, 6, 0, 0]}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Status Share"
              subtitle="Percentage breakdown"
              className="lg:col-span-2"
            >
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] || SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(val) => <span style={{ fontSize: 10, color: '#64748b' }}>{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Row 2: Monthly Trend */}
          <ChartCard
            title="Monthly Lead Trend"
            subtitle="Volume and estimated value — indicative trend (real timestamps will wire when backend exposes createdAt)"
          >
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={MONTHLY_TREND} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconSize={8}
                  formatter={(val) => <span style={{ fontSize: 10, color: '#64748b' }}>{val}</span>}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="leads"
                  name="Leads"
                  stroke="#6366f1"
                  fill="url(#leadGrad)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#6366f1' }}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="value"
                  name="value (INR)"
                  stroke="#10b981"
                  fill="url(#valueGrad)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Row 3: Priority + Source */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              title="Priority Analysis"
              subtitle="Lead count and pipeline value by priority level"
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={priorityData} margin={{ left: -10, right: 4, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={(v) => `${v}K`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    iconSize={8}
                    formatter={(val) => <span style={{ fontSize: 10, color: '#64748b' }}>{val}</span>}
                  />
                  <Bar yAxisId="left" dataKey="count" name="Leads" radius={[6, 6, 0, 0]}>
                    {priorityData.map((e, i) => (
                      <Cell key={i} fill={PRIORITY_COLORS[e.name] || '#6366f1'} />
                    ))}
                  </Bar>
                  <Bar yAxisId="right" dataKey="value" name="Value (INR K)" fill="#c7d2fe" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Lead Sources"
              subtitle="How leads are entering the pipeline"
            >
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {sourceData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 px-1">
                {sourceData.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="font-semibold text-slate-700">{s.name}</span>
                    <span>({s.value})</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* Row 4: Executive Leaderboard + Value Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <ChartCard
              title="Executive Performance"
              subtitle="Leads assigned and deals won per executive"
              className="lg:col-span-3"
            >
              {executiveData.length === 0 ? (
                <div className="text-center py-10 text-sm text-slate-400">No executive data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={executiveData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} width={90} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      iconSize={8}
                      formatter={(val) => <span style={{ fontSize: 10, color: '#64748b' }}>{val}</span>}
                    />
                    <Bar dataKey="leads" name="Leads" fill="#6366f1" radius={[0, 6, 6, 0]} />
                    <Bar dataKey="won" name="Won" fill="#10b981" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard
              title="Deal Value Distribution"
              subtitle="Count of leads by expected value range"
              className="lg:col-span-2"
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={valueBuckets} margin={{ left: -10, right: 4, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Leads" radius={[6, 6, 0, 0]}>
                    {valueBuckets.map((_, i) => (
                      <Cell key={i} fill={['#6366f1', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Row 5: Radar + Win-Rate Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              title="Pipeline Stage Radar"
              subtitle="Spread of leads across key funnel stages"
            >
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={100}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="status" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <PolarRadiusAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} />
                  <Radar name="Leads" dataKey="count" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Executive Win-Rate Table"
              subtitle="Detailed breakdown per assigned executive"
            >
              {executiveData.length === 0 ? (
                <div className="text-center py-10 text-sm text-slate-400">No data available</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {['Executive', 'Leads', 'Won', 'Win %', 'Value (K)'].map(h => (
                          <th
                            key={h}
                            className="py-2 px-2 text-left font-bold text-slate-500 uppercase tracking-wider text-[10px]"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {executiveData.map((row, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-2 font-semibold text-slate-800">{row.fullName}</td>
                          <td className="py-2.5 px-2 text-slate-600">{row.leads}</td>
                          <td className="py-2.5 px-2 text-emerald-600 font-bold">{row.won}</td>
                          <td className="py-2.5 px-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                row.winRate >= 50
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : row.winRate >= 25
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-rose-50 text-rose-600'
                              }`}
                            >
                              {row.winRate}%
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-slate-600 font-mono">{row.value}K</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartCard>
          </div>

          {/* Footer note */}
          <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
            <PieIcon size={12} />
            Monthly trend uses illustrative data. Live timestamps will be wired once the backend exposes createdAt in the leads response.
          </div>
        </>
      )}
    </div>
  );
};
