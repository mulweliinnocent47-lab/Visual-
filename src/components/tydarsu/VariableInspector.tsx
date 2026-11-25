import { VarValue } from '@/lib/interpreter';

interface VariableInspectorProps {
  variables: Record<string, VarValue>;
  isOpen: boolean;
  onToggle: () => void;
}

export default function VariableInspector({ variables, isOpen, onToggle }: VariableInspectorProps) {
  const entries = Object.entries(variables);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:left-auto md:right-4 md:bottom-4 md:w-72">
      <button
        onClick={onToggle}
        className="w-full md:w-auto flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-t-2xl md:rounded-2xl text-xs font-semibold text-foreground block-shadow transition-all active:scale-[0.98]"
      >
        <span>🔍</span>
        <span>Variable Inspector</span>
        <span className="ml-auto bg-secondary px-1.5 py-0.5 rounded-full text-muted-foreground text-[10px]">{entries.length}</span>
      </button>

      <div
        className="overflow-hidden transition-all duration-300 ease-out bg-card border border-t-0 border-border md:rounded-b-2xl block-shadow"
        style={{
          maxHeight: isOpen ? '240px' : '0px',
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div className="p-3 space-y-1.5 overflow-auto max-h-[220px]">
          {entries.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-2">No variables yet</p>
          )}
          {entries.map(([name, value]) => (
            <div key={name} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-secondary/50 animate-slide-up">
              <span className="text-[11px] font-medium text-foreground truncate">📦 {name}</span>
              <span className="text-[10px] text-primary font-mono bg-primary/10 px-2 py-0.5 rounded-lg truncate max-w-[120px]">
                {formatValue(value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatValue(v: VarValue): string {
  if (Array.isArray(v)) return `[${v.map(i => String(i)).join(', ')}]`;
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
}
