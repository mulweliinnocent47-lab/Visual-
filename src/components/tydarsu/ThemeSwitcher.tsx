import { Sun, Moon, Sparkles } from 'lucide-react';

interface ThemeSwitcherProps {
  theme: string;
  onSetTheme: (t: string) => void;
}

const themes = [
  { key: 'light', icon: Sun, label: 'Light' },
  { key: 'dark', icon: Moon, label: 'Dark' },
  { key: 'glass', icon: Sparkles, label: 'Glass' },
];

export default function ThemeSwitcher({ theme, onSetTheme }: ThemeSwitcherProps) {
  return (
    <div className="flex items-center gap-0.5 bg-secondary/60 rounded-xl p-0.5">
      {themes.map(t => {
        const active = theme === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onSetTheme(t.key)}
            className={`
              p-1.5 rounded-lg transition-all duration-300
              ${active ? 'bg-card block-shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}
            `}
            title={t.label}
          >
            <t.icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
