import { useState } from 'react';
import type { Point, Wire } from '@/lib/wires';
import { wirePath } from '@/lib/wires';

interface WireLayerProps {
  wires: Wire[];
  /** Wires touching this block are drawn stronger. */
  selectedBlockId: string | null;
  selectedWireKey: string | null;
  onSelectWire: (key: string | null) => void;
  onDisconnect: (fromId: string, toId: string) => void;
  /** A wire being dragged out of a block's output port. */
  dragWire: { from: Point; to: Point; overTarget: boolean } | null;
}

const PRIMARY = 'hsl(var(--primary))';
const TRUE_COLOR = 'hsl(142 71% 38%)';
const FALSE_COLOR = 'hsl(var(--destructive))';

function colorFor(wire: Wire): string {
  if (wire.label === 'true') return TRUE_COLOR;
  if (wire.label === 'false') return FALSE_COLOR;
  return PRIMARY;
}

/** Draws every connection as a visible wire from one block's output port to the next block's input port. */
export default function WireLayer({ wires, selectedBlockId, selectedWireKey, onSelectWire, onDisconnect, dragWire }: WireLayerProps) {
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible"
      style={{ minHeight: '200vh', minWidth: '200vw' }}
      role="group"
      aria-label="Connections between blocks"
    >
      {wires.map((wire) => {
        const color = colorFor(wire);
        const related = selectedBlockId !== null && (wire.fromId === selectedBlockId || wire.toId === selectedBlockId);
        const isSelected = selectedWireKey === wire.key;
        const emphasised = related || isSelected || hoverKey === wire.key;
        const tip = wire.to.x - 7;

        return (
          <g key={wire.key}>
            <path
              d={wire.path}
              fill="none"
              stroke={color}
              strokeWidth={emphasised ? 3.5 : 2.5}
              strokeLinecap="round"
              opacity={emphasised ? 1 : 0.55}
              style={{ transition: 'opacity 150ms, stroke-width 150ms' }}
            />
            <path
              d={`M ${tip - 8} ${wire.to.y - 4.5} L ${tip} ${wire.to.y} L ${tip - 8} ${wire.to.y + 4.5} Z`}
              fill={color}
              opacity={emphasised ? 1 : 0.7}
            />

            {wire.label && (
              // Near the target end, where the two branches have separated.
              <g transform={`translate(${tip - 14 - (wire.label === 'true' ? 30 : 34)}, ${wire.to.y - 24})`} pointerEvents="none">
                <rect width={wire.label === 'true' ? 30 : 34} height="15" rx="7.5" fill={color} />
                <text x={wire.label === 'true' ? 15 : 17} y="10.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="white">
                  {wire.label}
                </text>
              </g>
            )}

            {/* Wide invisible path so a wire is easy to tap */}
            <path
              d={wire.path}
              fill="none"
              stroke="transparent"
              strokeWidth={24}
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onPointerEnter={() => setHoverKey(wire.key)}
              onPointerLeave={() => setHoverKey((k) => (k === wire.key ? null : k))}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onSelectWire(isSelected ? null : wire.key); }}
            />

            {isSelected && (
              <g
                transform={`translate(${wire.mid.x}, ${wire.mid.y})`}
                style={{ pointerEvents: 'all', cursor: 'pointer' }}
                role="button"
                tabIndex={0}
                aria-label="Remove this connection"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onSelectWire(null); onDisconnect(wire.fromId, wire.toId); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectWire(null); onDisconnect(wire.fromId, wire.toId); }
                }}
              >
                <circle r="13" fill="hsl(var(--card))" stroke="hsl(var(--destructive))" strokeWidth="2" />
                <path d="M -4.5 -4.5 L 4.5 4.5 M 4.5 -4.5 L -4.5 4.5" stroke="hsl(var(--destructive))" strokeWidth="2.2" strokeLinecap="round" />
              </g>
            )}
          </g>
        );
      })}

      {dragWire && (
        <g pointerEvents="none">
          <path
            d={wirePath(dragWire.from, dragWire.to)}
            fill="none"
            stroke={PRIMARY}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={dragWire.overTarget ? undefined : '7 5'}
            opacity="0.9"
          />
          <circle cx={dragWire.to.x} cy={dragWire.to.y} r={dragWire.overTarget ? 7 : 5} fill={PRIMARY} opacity="0.9" />
        </g>
      )}
    </svg>
  );
}
