import { addConnection, removeConnection } from '@/lib/wires';
import { useState, useCallback, useEffect } from 'react';
import { Block, BlockType, ProjectData } from '@/types/blocks';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

const STORAGE_KEY = 'tydarsu_projects';
const CURRENT_KEY = 'tydarsu_current';
const THEME_KEY = 'tydarsu_theme';

let idCounter = 0;
const genId = () => `block_${Date.now()}_${idCounter++}`;

export function useProject() {
  const { user } = useAuth();

  const [project, setProject] = useState<ProjectData>(() => {
    const saved = localStorage.getItem(CURRENT_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return createNewProject('My App');
  });

  const [isPreview, setIsPreview] = useState(false);

  // Persist locally always
  useEffect(() => {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(project));
  }, [project]);

  const addBlock = useCallback((type: BlockType) => {
    const newBlock: Block = {
      id: genId(),
      type,
      label: getDefaultLabel(type),
      props: getDefaultProps(type),
      x: 20 + Math.random() * 100,
      y: 20 + Math.random() * 200,
      connections: [],
    };
    setProject(p => ({ ...p, blocks: [...p.blocks, newBlock], updatedAt: Date.now() }));
  }, []);

  const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
    setProject(p => ({
      ...p,
      blocks: p.blocks.map(b => b.id === id ? { ...b, ...updates } : b),
      updatedAt: Date.now(),
    }));
  }, []);

  const removeBlock = useCallback((id: string) => {
    setProject(p => ({
      ...p,
      blocks: p.blocks.filter(b => b.id !== id).map(b => ({
        ...b,
        connections: b.connections.filter(c => c !== id),
      })),
      updatedAt: Date.now(),
    }));
  }, []);

  const connectBlocks = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    setProject(p => ({
      ...p,
      blocks: p.blocks.map(b =>
        b.id === fromId && !b.connections.includes(toId)
          ? { ...b, connections: addConnection(b.connections, b.type, toId) }
          : b
      ),
      updatedAt: Date.now(),
    }));
  }, []);

  const disconnectBlocks = useCallback((fromId: string, toId: string) => {
    setProject(p => ({
      ...p,
      blocks: p.blocks.map(b =>
        b.id === fromId && b.connections.includes(toId)
          ? { ...b, connections: removeConnection(b.connections, b.type, toId) }
          : b
      ),
      updatedAt: Date.now(),
    }));
  }, []);

  // Cloud save
  const saveProject = useCallback(async () => {
    // Always save locally
    const projects = getSavedProjects();
    const idx = projects.findIndex(p => p.id === project.id);
    if (idx >= 0) projects[idx] = project;
    else projects.push(project);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));

    // If signed in, also save to cloud
    if (user) {
      try {
        if (project.cloudId) {
          await supabase.from('user_projects').update({
            name: project.name,
            project_data: project as any,
          }).eq('id', project.cloudId).eq('user_id', user.id);
        } else {
          const { data } = await supabase.from('user_projects').insert({
            user_id: user.id,
            name: project.name,
            project_data: project as any,
          }).select('id').single();
          if (data) {
            setProject(p => ({ ...p, cloudId: data.id }));
          }
        }
        toast.success('Saved to cloud ☁️');
      } catch {
        toast.error('Cloud save failed');
      }
    }
  }, [project, user]);

  const loadProject = useCallback((id: string) => {
    const projects = getSavedProjects();
    const found = projects.find(p => p.id === id);
    if (found) setProject(found);
  }, []);

  const loadProjectData = useCallback((data: ProjectData) => {
    setProject({ ...data, id: `proj_${Date.now()}`, createdAt: Date.now(), updatedAt: Date.now() });
  }, []);

  /** Swaps in a new set of blocks without changing which project this is. */
  const replaceBlocks = useCallback((blocks: Block[]) => {
    setProject(p => ({ ...p, blocks, updatedAt: Date.now() }));
  }, []);

  const newProject = useCallback((name: string) => {
    setProject(createNewProject(name));
  }, []);

  const renameProject = useCallback((name: string) => {
    setProject(p => ({ ...p, name, updatedAt: Date.now() }));
  }, []);

  const duplicateProject = useCallback(() => {
    setProject(p => ({
      ...p,
      id: `proj_${Date.now()}`,
      cloudId: undefined,
      name: `${p.name} (copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
  }, []);

  // Load cloud projects
  const loadCloudProjects = useCallback(async (): Promise<ProjectData[]> => {
    if (!user) return [];
    const { data } = await supabase.from('user_projects').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
    if (!data) return [];
    return data.map(row => ({
      ...(row.project_data as any as ProjectData),
      cloudId: row.id,
    }));
  }, [user]);

  return {
    project, isPreview, setIsPreview,
    addBlock, updateBlock, removeBlock, connectBlocks, disconnectBlocks,
    saveProject, loadProject, loadProjectData, replaceBlocks, newProject, renameProject,
    duplicateProject,
    savedProjects: getSavedProjects,
    loadCloudProjects,
  };
}

function createNewProject(name: string): ProjectData {
  return { id: `proj_${Date.now()}`, name, blocks: [], screens: ['Main'], activeScreen: 'Main', createdAt: Date.now(), updatedAt: Date.now() };
}

export function getSavedProjects(): ProjectData[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function getDefaultLabel(type: BlockType): string {
  const map: Partial<Record<BlockType, string>> = {
    math: 'Add', condition: 'If equal', ifElse: 'If / Else', onStart: 'On Start',
    timer: 'Wait 1s', wait: 'Wait', alert: 'Alert', repeat: 'Repeat',
    whileLoop: 'While', forLoop: 'For loop', breakLoop: 'Break', continueLoop: 'Continue',
    stopExec: 'Stop', functionDef: 'Function', functionCall: 'Call',
    listCreate: 'List', listAdd: 'Add to list', listRemove: 'Remove from list', listGet: 'Get from list',
    screen: 'Screen', navigateTo: 'Navigate', goBack: 'Go Back',
    row: 'Row', column: 'Column', scrollView: 'Scroll View',
    apiRequest: 'API Request', localStorage: 'Storage', dynamicList: 'Dynamic List', image: 'Image',
    // V6
    realtimeSubscribe: 'Subscribe', realtimePublish: 'Publish', presenceBlock: 'Presence',
    dbCreate: 'Create Record', dbRead: 'Read Record', dbUpdate: 'Update Record', dbDelete: 'Delete Record', dbQuery: 'Query',
    globalState: 'Global State', reactiveVar: 'Reactive Var',
    componentDef: 'Component', componentUse: 'Use Component',
    videoPlayer: 'Video', audioPlayer: 'Audio', fileUpload: 'File Upload', cameraBlock: 'Camera', micBlock: 'Microphone',
    animateBlock: 'Animate', onScrollAnim: 'On Scroll', pageTransition: 'Transition', gestureBlock: 'Gesture',
    permLocation: 'Location', permCamera: 'Camera Perm', permNotification: 'Notification',
  };
  return map[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

function getDefaultProps(type: BlockType): Record<string, any> {
  const map: Partial<Record<BlockType, Record<string, any>>> = {
    button: { text: 'Click me', event: 'click' },
    text: { text: 'Hello!' },
    input: { placeholder: 'Type here...', value: '' },
    display: { value: '0' },
    image: { src: 'https://placehold.co/200x120', alt: 'Image' },
    math: { op: '+', a: '0', b: '0' },
    variable: { name: 'x', value: '0', varType: 'text' },
    condition: { left: '0', op: '==', right: '0' },
    ifElse: { left: '0', op: '==', right: '0' },
    timer: { delay: 1000 },
    wait: { seconds: 1 },
    alert: { message: 'Hello!' },
    onStart: {},
    repeat: { times: '5' },
    whileLoop: { left: '0', op: '!=', right: '0' },
    forLoop: { varName: '_i', start: '0', end: '10', step: '1' },
    breakLoop: {}, continueLoop: {}, stopExec: {},
    functionDef: { name: 'myFunc', params: '' },
    functionCall: { name: 'myFunc', args: '' },
    listCreate: { name: 'myList' },
    listAdd: { listName: 'myList', item: '' },
    listRemove: { listName: 'myList', index: '0' },
    listGet: { listName: 'myList', index: '0' },
    screen: { screenName: 'Screen 1' },
    navigateTo: { targetScreen: 'Screen 1' },
    goBack: {},
    row: { gap: '8' }, column: { gap: '8' }, scrollView: { height: '300' },
    apiRequest: { url: 'https://jsonplaceholder.typicode.com/todos/1', method: 'GET', resultVar: '_response', headers: '', body: '' },
    localStorage: { action: 'get', key: 'data', value: '', resultVar: 'data' },
    dynamicList: { listName: 'myList', template: 'Item: {{item}}' },
    // V6
    realtimeSubscribe: { channel: 'chat', event: 'message', resultVar: '_msg' },
    realtimePublish: { channel: 'chat', event: 'message', payload: '' },
    presenceBlock: { channel: 'lobby', statusVar: '_users' },
    dbCreate: { collection: 'items', data: '{}' },
    dbRead: { collection: 'items', id: '', resultVar: '_record' },
    dbUpdate: { collection: 'items', id: '', data: '{}' },
    dbDelete: { collection: 'items', id: '' },
    dbQuery: { collection: 'items', filter: '', orderBy: '', limit: '10', resultVar: '_results' },
    globalState: { name: 'appState', value: '{}' },
    reactiveVar: { name: 'count', value: '0', onChange: '' },
    componentDef: { name: 'MyComponent', propsSchema: '' },
    componentUse: { name: 'MyComponent', propsData: '' },
    videoPlayer: { src: '', autoplay: false, controls: true },
    audioPlayer: { src: '', autoplay: false, controls: true },
    fileUpload: { accept: '*', resultVar: '_file', maxSize: '5' },
    cameraBlock: { resultVar: '_photo', facing: 'user' },
    micBlock: { resultVar: '_audio', maxDuration: '30' },
    animateBlock: { animation: 'fadeIn', duration: '0.5', delay: '0', target: '' },
    onScrollAnim: { animation: 'slideUp', threshold: '0.5' },
    pageTransition: { type: 'fade', duration: '0.3' },
    gestureBlock: { gesture: 'swipeLeft', handler: '' },
    permLocation: { resultVar: '_location' },
    permCamera: { resultVar: '_cameraGranted' },
    permNotification: { resultVar: '_notifGranted' },
  };
  return map[type] || {};
}

export function useTheme() {
  const [theme, setThemeState] = useState<string>(() => {
    return localStorage.getItem(THEME_KEY) || 'light';
  });

  const setTheme = useCallback((t: string) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
    const root = document.documentElement;
    root.classList.remove('dark', 'glass');
    if (t !== 'light') root.classList.add(t);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'glass');
    if (theme !== 'light') root.classList.add(theme);
  }, [theme]);

  return { theme, setTheme };
}
