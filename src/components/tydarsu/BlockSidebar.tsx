import { useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { BlockType, BLOCK_DEFINITIONS, BLOCK_COLORS, CATEGORIES, BlockCategory } from '@/types/blocks';
import { useBlockTooltip } from './LearningMode';
import { BlockMode, isBasicBlock } from '@/lib/blockModes';

interface BlockSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBlock: (type: BlockType) => void;
  learningMode?: boolean;
  mode: BlockMode;
  onChangeMode: (mode: BlockMode) => void;
}

const blocksByCategory: Record<BlockCategory, BlockType[]> = {
  ui: ['button', 'text', 'input', 'display', 'image', 'badge', 'avatar', 'progressBar', 'tabsBlock'],
  forms: ['selectDropdown', 'checkbox', 'textarea'],
  website: ['navbar', 'hero', 'footer', 'cardGrid', 'separator', 'link'],
  screens: ['screen', 'navigateTo', 'goBack'],
  layout: ['row', 'column', 'scrollView', 'dynamicList'],
  logic: ['condition', 'ifElse', 'onStart', 'timer', 'wait', 'stopExec'],
  loops: ['repeat', 'whileLoop', 'forLoop', 'breakLoop', 'continueLoop'],
  math: ['math'],
  data: ['variable', 'listCreate', 'listAdd', 'listRemove', 'listGet'],
  state: ['globalState', 'reactiveVar'],
  database: ['dbCreate', 'dbRead', 'dbUpdate', 'dbDelete', 'dbQuery'],
  realtime: ['realtimeSubscribe', 'realtimePublish', 'presenceBlock'],
  backend: ['apiRequest', 'localStorage'],
  media: ['videoPlayer', 'audioPlayer', 'fileUpload', 'cameraBlock', 'micBlock'],
  components: ['componentDef', 'componentUse'],
  animation: ['animateBlock', 'onScrollAnim', 'pageTransition', 'gestureBlock'],
  permissions: ['permLocation', 'permCamera', 'permNotification'],
  functions: ['functionDef', 'functionCall'],
  effects: ['alert'],
  auth: ['authLogin', 'authRegister', 'authLogout', 'authForgotPassword', 'authGuard', 'authSocialLogin'],
  advanced: ['customCode'],
};

function BlockTooltip({ type }: { type: string }) {
  const tip = useBlockTooltip(type);
  if (!tip) return null;
  return (
    <div className="absolute left-full top-0 ml-2 z-50 w-52 p-3 rounded-2xl bg-card border border-border card-shadow text-[11px] text-muted-foreground leading-relaxed animate-slide-up pointer-events-none">
      <div className="absolute -left-1 top-3 w-2 h-2 bg-card border-l border-b border-border rotate-45" />
      {tip}
    </div>
  );
}

export default function BlockSidebar({ isOpen, onClose, onAddBlock, learningMode, mode, onChangeMode }: BlockSidebarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ ui: true, screens: true });
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const toggle = (cat: string) => {
    setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const query = search.trim().toLowerCase();
  const matchesSearch = (t: BlockType) => {
    if (!query) return true;
    const def = BLOCK_DEFINITIONS[t];
    return def.label.toLowerCase().includes(query) || def.description.toLowerCase().includes(query);
  };
  const isBasic = mode === 'basic';

  // In Basic mode, tell the person when their search matches blocks that are hidden.
  const hiddenMatches = isBasic && query
    ? Object.values(blocksByCategory).flat().filter(t => !isBasicBlock(t) && matchesSearch(t)).length
    : 0;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-foreground/15 backdrop-blur-sm z-30 md:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed md:relative top-16 left-0 bottom-0 z-40 w-72 md:w-64
          bg-card/95 glass-sidebar border-r border-border/40
          transition-all duration-300 ease-out overflow-y-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Mode */}
        <div className="px-3 pt-3">
          <div className="flex items-center gap-0.5 bg-secondary/60 rounded-xl p-0.5" role="group" aria-label="Block set">
            {([['basic', 'Basic'], ['all', 'All blocks']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => onChangeMode(key)}
                aria-pressed={mode === key}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                  mode === key ? 'bg-card block-shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border/30">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-secondary/40 border border-border/50 focus-within:border-primary/30 focus-within:bg-secondary/60 transition-all">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input
              className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60"
              placeholder="Search blocks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="p-3 space-y-1">
          {CATEGORIES.map(cat => {
            const categoryBlocks = blocksByCategory[cat.key];
            if (!categoryBlocks) return null;
            const allBlocks = isBasic ? categoryBlocks.filter(isBasicBlock) : categoryBlocks;
            const blocks = query ? allBlocks.filter(matchesSearch) : allBlocks;
            if (blocks.length === 0) return null;
            const isExpanded = query ? true : (expanded[cat.key] ?? false);

            return (
              <div key={cat.key} className="animate-slide-up">
                <button
                  onClick={() => toggle(cat.key)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl hover:bg-secondary/50 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{cat.icon}</span>
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">{cat.label}</span>
                    <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full font-medium">{blocks.length}</span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>

                <div
                  className="overflow-hidden transition-all duration-300 ease-out"
                  style={{
                    maxHeight: isExpanded ? `${blocks.length * 64}px` : '0px',
                    opacity: isExpanded ? 1 : 0,
                  }}
                >
                  <div className="space-y-1 py-1 px-1">
                    {blocks.map((type) => {
                      const def = BLOCK_DEFINITIONS[type];
                      const color = BLOCK_COLORS[type];
                      return (
                        <div key={type} className="relative">
                          <button
                            onClick={() => { onAddBlock(type); onClose(); }}
                            onMouseEnter={() => learningMode && setHoveredBlock(type)}
                            onMouseLeave={() => setHoveredBlock(null)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-secondary/20 hover:bg-secondary/60 active:scale-[0.98] transition-all duration-200 group"
                          >
                            <span className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center text-sm shadow-sm group-hover:shadow-md transition-shadow`}>
                              {def.icon}
                            </span>
                            <div className="text-left flex-1 min-w-0">
                              <div className="text-[13px] font-semibold text-foreground leading-tight">{def.label}</div>
                              <div className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">{def.description}</div>
                            </div>
                          </button>
                          {learningMode && hoveredBlock === type && <BlockTooltip type={type} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {isBasic && (
            <div className="px-3 pt-3 pb-4 text-center space-y-2">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {hiddenMatches > 0
                  ? `${hiddenMatches} more ${hiddenMatches === 1 ? 'block matches' : 'blocks match'} your search in All blocks.`
                  : 'Need screens, loops, database or sign-in blocks?'}
              </p>
              <button
                onClick={() => onChangeMode('all')}
                className="px-4 py-2 rounded-xl bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 active:scale-95 transition-all border border-border"
              >
                Show all blocks
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
