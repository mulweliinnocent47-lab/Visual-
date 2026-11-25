import { Smartphone, Tablet, Monitor } from 'lucide-react';

export type DeviceMode = 'mobile' | 'tablet' | 'desktop';

interface DevicePreviewProps {
  mode: DeviceMode;
  onModeChange: (mode: DeviceMode) => void;
}

const DEVICES: { mode: DeviceMode; icon: React.ReactNode; label: string; width: string }[] = [
  { mode: 'mobile', icon: <Smartphone size={13} />, label: 'Mobile', width: '375px' },
  { mode: 'tablet', icon: <Tablet size={13} />, label: 'Tablet', width: '768px' },
  { mode: 'desktop', icon: <Monitor size={13} />, label: 'Desktop', width: '100%' },
];

export default function DevicePreview({ mode, onModeChange }: DevicePreviewProps) {
  return (
    <div className="flex gap-0.5 bg-secondary/50 rounded-xl p-0.5">
      {DEVICES.map(d => (
        <button
          key={d.mode}
          onClick={() => onModeChange(d.mode)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
            mode === d.mode
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title={d.label}
        >
          {d.icon}
        </button>
      ))}
    </div>
  );
}

export function getDeviceWidth(mode: DeviceMode): string {
  switch (mode) {
    case 'mobile': return '375px';
    case 'tablet': return '768px';
    case 'desktop': return '100%';
  }
}
