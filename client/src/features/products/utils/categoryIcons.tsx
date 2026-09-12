import React from 'react';
import { Zap, Cpu, Battery, Layers, Sun, Activity } from 'lucide-react';

export const getCategoryIcon = (category: string, size = 18): React.ReactNode => {
  const norm = category?.toLowerCase() || '';
  if (norm.includes('generator')) return <Zap size={size} className="cat-icon-zap" />;
  if (norm.includes('inverter')) return <Cpu size={size} className="cat-icon-cpu" />;
  if (norm.includes('batter')) return <Battery size={size} className="cat-icon-battery" />;
  if (norm.includes('switchgear')) return <Layers size={size} className="cat-icon-switchgear" />;
  if (norm.includes('solar')) return <Sun size={size} className="cat-icon-sun" />;
  return <Activity size={size} className="cat-icon-default" />;
};
