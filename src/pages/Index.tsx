import { useState, useCallback, useEffect } from 'react';
import { useProject, useTheme } from '@/hooks/useProject';
import { useAuth } from '@/hooks/useAuth';
import { useHistory } from '@/hooks/useHistory';
import { useBlockMode } from '@/hooks/useBlockMode';
import Header from '@/components/tydarsu/Header';
import BlockSidebar from '@/components/tydarsu/BlockSidebar';
import Workspace from '@/components/tydarsu/Workspace';
import PreviewMode from '@/components/tydarsu/PreviewMode';
import ProjectModal from '@/components/tydarsu/ProjectModal';
import ExportModal from '@/components/tydarsu/ExportModal';
import ImportModal from '@/components/tydarsu/ImportModal';
import TemplateGallery from '@/components/tydarsu/TemplateGallery';
import IntroScreen from '@/components/tydarsu/IntroScreen';
import LearningMode from '@/components/tydarsu/LearningMode';
import BlockCustomizer from '@/components/tydarsu/BlockCustomizer';
import InspectorPanel from '@/components/tydarsu/InspectorPanel';
import AiAssistant from '@/components/tydarsu/AiAssistant';
import { Block } from '@/types/blocks';
import { toast } from 'sonner';

const Index = () => {
  const {
    project, isPreview, setIsPreview,
    addBlock, updateBlock, removeBlock, connectBlocks, disconnectBlocks,
    saveProject, loadProject, loadProjectData, replaceBlocks, newProject,
    savedProjects, duplicateProject, loadCloudProjects,
  } = useProject();

  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { pushState, undo, redo, canUndo, canRedo } = useHistory(project.blocks);
  const { mode: blockMode, setMode: setBlockMode } = useBlockMode();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; mode: 'load' | 'new' }>({ open: false, mode: 'new' });
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [learningMode, setLearningMode] = useState(false);
  const [customizeBlock, setCustomizeBlock] = useState<Block | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [showAi, setShowAi] = useState(false);

  // Push state for undo before changes
  const handleUpdateBlock = useCallback((id: string, updates: Partial<Block>) => {
    pushState(project.blocks);
    updateBlock(id, updates);
  }, [updateBlock, pushState, project.blocks]);

  const handleRemoveBlock = useCallback((id: string) => {
    pushState(project.blocks);
    removeBlock(id);
    if (selectedBlock?.id === id) setSelectedBlock(null);
  }, [removeBlock, pushState, project.blocks, selectedBlock]);

  const handleAddBlock = useCallback((type: any) => {
    pushState(project.blocks);
    addBlock(type);
  }, [addBlock, pushState, project.blocks]);

  const handleConnect = useCallback((from: string, to: string) => {
    pushState(project.blocks);
    connectBlocks(from, to);
  }, [connectBlocks, pushState, project.blocks]);

  const handleDisconnect = useCallback((from: string, to: string) => {
    pushState(project.blocks);
    disconnectBlocks(from, to);
  }, [disconnectBlocks, pushState, project.blocks]);

  const handleUndo = useCallback(() => {
    const prev = undo(project.blocks);
    if (prev) loadProjectData({ ...project, blocks: prev });
  }, [undo, project, loadProjectData]);

  const handleRedo = useCallback(() => {
    const next = redo(project.blocks);
    if (next) loadProjectData({ ...project, blocks: next });
  }, [redo, project, loadProjectData]);

  const handleDuplicate = useCallback((id: string) => {
    const block = project.blocks.find(b => b.id === id);
    if (!block) return;
    pushState(project.blocks);
    const newBlock: Block = {
      ...JSON.parse(JSON.stringify(block)),
      id: `block_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      x: block.x + 24,
      y: block.y + 24,
      connections: [],
    };
    loadProjectData({ ...project, blocks: [...project.blocks, newBlock] });
  }, [project, pushState, loadProjectData]);

  const handleSave = useCallback(async () => {
    await saveProject();
    if (!user) toast.success('Project saved locally!');
  }, [saveProject, user]);

  const handleIntroDone = useCallback(() => setShowIntro(false), []);

  const handleMergeBlocks = useCallback((blocks: Block[]) => {
    pushState(project.blocks);
    loadProjectData({ ...project, blocks: [...project.blocks, ...blocks] });
  }, [project, pushState, loadProjectData]);

  const handleApplyAiBlocks = useCallback((blocks: Block[]) => {
    pushState(project.blocks);
    replaceBlocks(blocks);
  }, [project.blocks, pushState, replaceBlocks]);

  // Sync selectedBlock with latest block data
  useEffect(() => {
    if (selectedBlock) {
      const updated = project.blocks.find(b => b.id === selectedBlock.id);
      if (updated && updated !== selectedBlock) setSelectedBlock(updated);
      else if (!updated) setSelectedBlock(null);
    }
  }, [project.blocks]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden theme-transition">
      {showIntro && <IntroScreen onDone={handleIntroDone} />}

      <Header
        projectName={project.name}
        isPreview={isPreview}
        theme={theme}
        learningMode={learningMode}
        onRun={() => setIsPreview(true)}
        onStop={() => setIsPreview(false)}
        onSave={handleSave}
        onLoad={() => setModal({ open: true, mode: 'load' })}
        onNew={() => setModal({ open: true, mode: 'new' })}
        onExport={() => setShowExport(true)}
        onImport={() => setShowImport(true)}
        onTemplates={() => setShowTemplates(true)}
        onSetTheme={setTheme}
        onToggleLearning={() => setLearningMode(l => !l)}
        onAiAssistant={() => setShowAi(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {!isPreview && (
          <>
            <BlockSidebar
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              onAddBlock={handleAddBlock}
              learningMode={learningMode}
              mode={blockMode}
              onChangeMode={setBlockMode}
            />
            <Workspace
              blocks={project.blocks}
              onUpdate={handleUpdateBlock}
              onRemove={handleRemoveBlock}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onToggleSidebar={() => setSidebarOpen(true)}
              onCustomize={(block) => setCustomizeBlock(block)}
              onSelectBlock={(block) => setSelectedBlock(block)}
              selectedBlockId={selectedBlock?.id || null}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={canUndo}
              canRedo={canRedo}
              onDuplicate={handleDuplicate}
            />
            {selectedBlock && (
              <InspectorPanel
                block={selectedBlock}
                onUpdate={handleUpdateBlock}
                onClose={() => setSelectedBlock(null)}
              />
            )}
          </>
        )}
        {isPreview && <PreviewMode blocks={project.blocks} />}
      </div>

      <ProjectModal
        isOpen={modal.open}
        mode={modal.mode}
        onClose={() => setModal({ open: false, mode: 'new' })}
        onLoad={loadProject}
        onNew={newProject}
        getSavedProjects={savedProjects}
        loadCloudProjects={loadCloudProjects}
      />

      <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} project={project} />
      <ImportModal isOpen={showImport} onClose={() => setShowImport(false)} onImport={loadProjectData} onDuplicate={duplicateProject} currentProject={project} />
      <TemplateGallery isOpen={showTemplates} onClose={() => setShowTemplates(false)} onSelect={loadProjectData} />
      <LearningMode isEnabled={learningMode} onToggle={() => setLearningMode(l => !l)} blocks={project.blocks} />
      <BlockCustomizer isOpen={customizeBlock !== null} block={customizeBlock} onClose={() => setCustomizeBlock(null)} onUpdate={handleUpdateBlock} />
      <AiAssistant isOpen={showAi} onClose={() => setShowAi(false)} onLoadProject={loadProjectData} onMergeBlocks={handleMergeBlocks} project={project} onApplyBlocks={handleApplyAiBlocks} />
    </div>
  );
};

export default Index;
