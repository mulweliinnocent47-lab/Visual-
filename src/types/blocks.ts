export type BlockType =
  | 'button' | 'text' | 'input' | 'display'
  | 'math' | 'variable' | 'condition'
  | 'timer' | 'alert' | 'onStart'
  | 'repeat' | 'whileLoop' | 'forLoop'
  | 'ifElse' | 'wait' | 'stopExec' | 'breakLoop' | 'continueLoop'
  | 'functionDef' | 'functionCall'
  | 'listCreate' | 'listAdd' | 'listRemove' | 'listGet'
  | 'screen' | 'navigateTo' | 'goBack'
  | 'row' | 'column' | 'scrollView'
  | 'apiRequest' | 'localStorage'
  | 'dynamicList'
  | 'image'
  | 'realtimeSubscribe' | 'realtimePublish' | 'presenceBlock'
  | 'dbCreate' | 'dbRead' | 'dbUpdate' | 'dbDelete' | 'dbQuery'
  | 'globalState' | 'reactiveVar'
  | 'componentDef' | 'componentUse'
  | 'videoPlayer' | 'audioPlayer' | 'fileUpload' | 'cameraBlock' | 'micBlock'
  | 'animateBlock' | 'onScrollAnim' | 'pageTransition' | 'gestureBlock'
  | 'permLocation' | 'permCamera' | 'permNotification'
  | 'authLogin' | 'authRegister' | 'authLogout' | 'authForgotPassword' | 'authGuard' | 'authSocialLogin'
  // V4 Website blocks
  | 'navbar' | 'hero' | 'footer' | 'cardGrid' | 'separator' | 'link'
  | 'selectDropdown' | 'checkbox' | 'textarea' | 'badge' | 'avatar' | 'progressBar' | 'tabsBlock'
  | 'customCode';

export type BlockCategory = 'ui' | 'logic' | 'math' | 'data' | 'effects' | 'loops' | 'functions' | 'screens' | 'layout' | 'backend' | 'realtime' | 'database' | 'state' | 'components' | 'media' | 'animation' | 'permissions' | 'auth' | 'website' | 'forms' | 'advanced';

export type VariableType = 'number' | 'text' | 'boolean' | 'list';

/** Style properties every block can have */
export interface BlockStyle {
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  shadowX?: number;
  shadowY?: number;
  shadowBlur?: number;
  shadowColor?: string;
  opacity?: number;
  gradientFrom?: string;
  gradientTo?: string;
  gradientDirection?: string;
  backgroundImage?: string;
  hoverBg?: string;
  hoverTextColor?: string;
  hoverScale?: number;
  activeBg?: string;
  disabledOpacity?: number;
}

export interface BlockLayout {
  position?: 'relative' | 'absolute' | 'fixed';
  posX?: string;
  posY?: string;
  width?: string;
  height?: string;
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  zIndex?: number;
  rotation?: number;
  scale?: number;
  alignSelf?: 'start' | 'center' | 'end' | 'stretch';
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string;
  gap?: number;
  flexWrap?: boolean;
  scrollDirection?: 'vertical' | 'horizontal';
  snapScroll?: boolean;
  stickyPosition?: boolean;
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  justifyContent?: string;
  alignItems?: string;
}

export interface BlockEvents {
  onClick?: string;
  onDoubleClick?: string;
  onLongPress?: string;
  onHover?: string;
  onFocus?: string;
  onChange?: string;
  onSubmit?: string;
  debounceMs?: number;
  confirmAction?: boolean;
  confirmMessage?: string;
}

export interface BlockRenderControl {
  showCondition?: string;
  showConditionValue?: string;
  showIfLoggedIn?: boolean;
  lazyRender?: boolean;
  mountAnimation?: string;
  unmountAnimation?: string;
  visibilityAnimation?: string;
}

export interface ResponsiveOverrides {
  mobile?: Partial<BlockStyle & BlockLayout>;
  tablet?: Partial<BlockStyle & BlockLayout>;
  desktop?: Partial<BlockStyle & BlockLayout>;
}

export interface Block {
  id: string;
  type: BlockType;
  label: string;
  props: Record<string, any>;
  x: number;
  y: number;
  connections: string[];
  children?: string[];
  error?: string;
  screenId?: string;
  style?: BlockStyle;
  layout?: BlockLayout;
  events?: BlockEvents;
  renderControl?: BlockRenderControl;
  responsive?: ResponsiveOverrides;
  locked?: boolean;
  groupId?: string;
}

export interface ProjectData {
  id: string;
  name: string;
  blocks: Block[];
  createdAt: number;
  updatedAt: number;
  screens?: string[];
  activeScreen?: string;
  cloudId?: string;
}

export interface BlockDefinition {
  label: string;
  icon: string;
  description: string;
  category: BlockCategory;
  isContainer?: boolean;
}

export const BLOCK_DEFINITIONS: Record<BlockType, BlockDefinition> = {
  button:    { label: 'Button',    icon: '👆', description: 'Clickable button',    category: 'ui' },
  text:      { label: 'Text',      icon: '📝', description: 'Static text label',   category: 'ui' },
  input:     { label: 'Input',     icon: '✏️', description: 'Text input field',    category: 'ui' },
  display:   { label: 'Display',   icon: '📺', description: 'Show a value',        category: 'ui' },
  image:     { label: 'Image',     icon: '🖼️', description: 'Display an image',    category: 'ui' },
  condition: { label: 'If',        icon: '🔀', description: 'If condition',        category: 'logic' },
  ifElse:    { label: 'If / Else', icon: '🔀', description: 'If with else branch', category: 'logic' },
  onStart:   { label: 'On Start',  icon: '🚀', description: 'Runs when app starts', category: 'logic' },
  timer:     { label: 'Timer',     icon: '⏱️', description: 'Delay execution',     category: 'logic' },
  wait:      { label: 'Wait',      icon: '⏳', description: 'Pause for seconds',   category: 'logic' },
  stopExec:  { label: 'Stop',      icon: '🛑', description: 'Stop all execution',  category: 'logic' },
  math:      { label: 'Math',      icon: '🔢', description: 'Math operation',      category: 'math' },
  variable:  { label: 'Variable',  icon: '📦', description: 'Store a value',       category: 'data' },
  listCreate: { label: 'List',     icon: '📋', description: 'Create a list',       category: 'data' },
  listAdd:   { label: 'List Add',  icon: '➕', description: 'Add item to list',    category: 'data' },
  listRemove: { label: 'List Remove', icon: '➖', description: 'Remove from list', category: 'data' },
  listGet:   { label: 'List Get',  icon: '🔍', description: 'Get item from list',  category: 'data' },
  alert:     { label: 'Alert',     icon: '💬', description: 'Show a message',      category: 'effects' },
  repeat:    { label: 'Repeat',    icon: '🔁', description: 'Repeat X times',      category: 'loops', isContainer: true },
  whileLoop: { label: 'While',     icon: '🔄', description: 'While condition',     category: 'loops', isContainer: true },
  forLoop:   { label: 'For',       icon: '🔃', description: 'For start→end',       category: 'loops', isContainer: true },
  breakLoop: { label: 'Break',     icon: '⛔', description: 'Break out of loop',   category: 'loops' },
  continueLoop: { label: 'Continue', icon: '⏭️', description: 'Skip to next iteration', category: 'loops' },
  functionDef:  { label: 'Function',   icon: '🧩', description: 'Define a function', category: 'functions', isContainer: true },
  functionCall: { label: 'Call',       icon: '📞', description: 'Call a function',   category: 'functions' },
  screen:      { label: 'Screen',     icon: '📱', description: 'App screen/page',    category: 'screens', isContainer: true },
  navigateTo:  { label: 'Navigate',   icon: '➡️', description: 'Go to screen',       category: 'screens' },
  goBack:      { label: 'Go Back',    icon: '⬅️', description: 'Previous screen',    category: 'screens' },
  row:         { label: 'Row',        icon: '↔️', description: 'Horizontal layout',  category: 'layout', isContainer: true },
  column:      { label: 'Column',     icon: '↕️', description: 'Vertical layout',    category: 'layout', isContainer: true },
  scrollView:  { label: 'Scroll View', icon: '📜', description: 'Scrollable area',   category: 'layout', isContainer: true },
  dynamicList: { label: 'Dynamic List', icon: '📃', description: 'Render list items', category: 'layout' },
  apiRequest:  { label: 'API Request', icon: '🌐', description: 'HTTP API call',     category: 'backend' },
  localStorage: { label: 'Storage',   icon: '💾', description: 'Save/load local data', category: 'backend' },
  realtimeSubscribe: { label: 'Subscribe', icon: '📡', description: 'Listen for real-time updates', category: 'realtime' },
  realtimePublish:   { label: 'Publish',   icon: '📤', description: 'Send real-time message',       category: 'realtime' },
  presenceBlock:     { label: 'Presence',  icon: '👥', description: 'Online/typing status',         category: 'realtime' },
  dbCreate: { label: 'Create Record', icon: '➕', description: 'Insert into collection', category: 'database' },
  dbRead:   { label: 'Read Record',   icon: '📖', description: 'Get record by ID',      category: 'database' },
  dbUpdate: { label: 'Update Record', icon: '✏️', description: 'Update a record',       category: 'database' },
  dbDelete: { label: 'Delete Record', icon: '🗑️', description: 'Delete a record',      category: 'database' },
  dbQuery:  { label: 'Query',         icon: '🔎', description: 'Filter & sort records', category: 'database' },
  globalState: { label: 'Global State', icon: '🌍', description: 'App-wide state',       category: 'state' },
  reactiveVar: { label: 'Reactive Var', icon: '⚡', description: 'Auto-update on change', category: 'state' },
  componentDef: { label: 'Component',     icon: '🧊', description: 'Define reusable component', category: 'components', isContainer: true },
  componentUse: { label: 'Use Component', icon: '📎', description: 'Use a component',           category: 'components' },
  videoPlayer: { label: 'Video Player', icon: '🎬', description: 'Play video',        category: 'media' },
  audioPlayer: { label: 'Audio Player', icon: '🔊', description: 'Play audio',        category: 'media' },
  fileUpload:  { label: 'File Upload',  icon: '📁', description: 'Upload file',       category: 'media' },
  cameraBlock: { label: 'Camera',       icon: '📷', description: 'Access camera',     category: 'media' },
  micBlock:    { label: 'Microphone',   icon: '🎤', description: 'Record audio',      category: 'media' },
  animateBlock:   { label: 'Animate',     icon: '✨', description: 'Animate element',       category: 'animation' },
  onScrollAnim:   { label: 'On Scroll',   icon: '📜', description: 'Animate on scroll',     category: 'animation' },
  pageTransition: { label: 'Transition',  icon: '🔄', description: 'Page transition effect', category: 'animation' },
  gestureBlock:   { label: 'Gesture',     icon: '👆', description: 'Swipe/pinch handler',   category: 'animation' },
  permLocation:     { label: 'Location',     icon: '📍', description: 'Request GPS access',          category: 'permissions' },
  permCamera:       { label: 'Camera Perm',  icon: '📷', description: 'Request camera permission',   category: 'permissions' },
  permNotification: { label: 'Notification', icon: '🔔', description: 'Request notification access', category: 'permissions' },
  authLogin:         { label: 'Login',           icon: '🔑', description: 'Email/password login',       category: 'auth' },
  authRegister:      { label: 'Register',        icon: '📝', description: 'Create new account',         category: 'auth' },
  authLogout:        { label: 'Logout',          icon: '🚪', description: 'Sign out user',              category: 'auth' },
  authForgotPassword:{ label: 'Forgot Password', icon: '🔒', description: 'Send password reset email',  category: 'auth' },
  authGuard:         { label: 'Auth Guard',      icon: '🛡️', description: 'Run only if logged in',     category: 'auth' },
  authSocialLogin:   { label: 'Social Login',    icon: '🌐', description: 'Sign in with Google',        category: 'auth' },
  // Website blocks
  navbar:    { label: 'Navbar',     icon: '🧭', description: 'Navigation bar with links',  category: 'website' },
  hero:      { label: 'Hero',      icon: '🏠', description: 'Hero section with CTA',       category: 'website' },
  footer:    { label: 'Footer',    icon: '🔻', description: 'Page footer',                 category: 'website' },
  cardGrid:  { label: 'Card Grid', icon: '🃏', description: 'Grid of cards from list',     category: 'website' },
  separator: { label: 'Divider',   icon: '➖', description: 'Horizontal divider line',     category: 'website' },
  link:      { label: 'Link',      icon: '🔗', description: 'Clickable hyperlink',         category: 'website' },
  // Form blocks
  selectDropdown: { label: 'Dropdown',  icon: '📋', description: 'Select dropdown',        category: 'forms' },
  checkbox:       { label: 'Checkbox',  icon: '☑️', description: 'Toggle checkbox',         category: 'forms' },
  textarea:       { label: 'Textarea',  icon: '📄', description: 'Multi-line text input',   category: 'forms' },
  // Display blocks
  badge:       { label: 'Badge',       icon: '🏷️', description: 'Status badge',             category: 'ui' },
  avatar:      { label: 'Avatar',      icon: '👤', description: 'User avatar',              category: 'ui' },
  progressBar: { label: 'Progress',    icon: '📊', description: 'Progress bar',             category: 'ui' },
  tabsBlock:   { label: 'Tabs',        icon: '📑', description: 'Tab navigation',           category: 'ui' },
  // Custom code
  customCode:  { label: 'Custom Code', icon: '💻', description: 'Write HTML/JS/CSS code',  category: 'advanced' },
};

export const BLOCK_COLORS: Record<BlockType, string> = {
  button: 'bg-block-button', text: 'bg-block-text', input: 'bg-block-input',
  display: 'bg-block-display', image: 'bg-block-display',
  math: 'bg-block-math', variable: 'bg-block-variable',
  condition: 'bg-block-condition', ifElse: 'bg-block-condition',
  timer: 'bg-block-logic', onStart: 'bg-block-logic', wait: 'bg-block-logic', stopExec: 'bg-block-effects',
  alert: 'bg-block-effects',
  repeat: 'bg-block-loop', whileLoop: 'bg-block-loop', forLoop: 'bg-block-loop',
  breakLoop: 'bg-block-loop', continueLoop: 'bg-block-loop',
  listCreate: 'bg-block-variable', listAdd: 'bg-block-variable', listRemove: 'bg-block-variable', listGet: 'bg-block-variable',
  functionDef: 'bg-block-function', functionCall: 'bg-block-function',
  screen: 'bg-block-screen', navigateTo: 'bg-block-screen', goBack: 'bg-block-screen',
  row: 'bg-block-layout', column: 'bg-block-layout', scrollView: 'bg-block-layout',
  apiRequest: 'bg-block-backend', localStorage: 'bg-block-backend',
  dynamicList: 'bg-block-layout',
  realtimeSubscribe: 'bg-block-realtime', realtimePublish: 'bg-block-realtime', presenceBlock: 'bg-block-realtime',
  dbCreate: 'bg-block-database', dbRead: 'bg-block-database', dbUpdate: 'bg-block-database', dbDelete: 'bg-block-database', dbQuery: 'bg-block-database',
  globalState: 'bg-block-state', reactiveVar: 'bg-block-state',
  componentDef: 'bg-block-component', componentUse: 'bg-block-component',
  videoPlayer: 'bg-block-media', audioPlayer: 'bg-block-media', fileUpload: 'bg-block-media', cameraBlock: 'bg-block-media', micBlock: 'bg-block-media',
  animateBlock: 'bg-block-anim', onScrollAnim: 'bg-block-anim', pageTransition: 'bg-block-anim', gestureBlock: 'bg-block-anim',
  permLocation: 'bg-block-perm', permCamera: 'bg-block-perm', permNotification: 'bg-block-perm',
  authLogin: 'bg-block-auth', authRegister: 'bg-block-auth', authLogout: 'bg-block-auth',
  authForgotPassword: 'bg-block-auth', authGuard: 'bg-block-auth', authSocialLogin: 'bg-block-auth',
  // Website
  navbar: 'bg-block-screen', hero: 'bg-block-screen', footer: 'bg-block-screen',
  cardGrid: 'bg-block-layout', separator: 'bg-block-layout', link: 'bg-block-button',
  // Forms
  selectDropdown: 'bg-block-input', checkbox: 'bg-block-input', textarea: 'bg-block-input',
  // UI extras
  badge: 'bg-block-display', avatar: 'bg-block-display', progressBar: 'bg-block-display', tabsBlock: 'bg-block-display',
  // Advanced
  customCode: 'bg-block-function',
};

export const CATEGORIES: { key: BlockCategory; label: string; icon: string }[] = [
  { key: 'ui',          label: 'UI',          icon: '🎨' },
  { key: 'forms',       label: 'Forms',       icon: '📋' },
  { key: 'website',     label: 'Website',     icon: '🌐' },
  { key: 'screens',     label: 'Screens',     icon: '📱' },
  { key: 'layout',      label: 'Layout',      icon: '📐' },
  { key: 'logic',       label: 'Logic',       icon: '⚡' },
  { key: 'loops',       label: 'Loops',       icon: '🔁' },
  { key: 'math',        label: 'Math',        icon: '🔢' },
  { key: 'data',        label: 'Data',        icon: '📦' },
  { key: 'state',       label: 'State',       icon: '🌍' },
  { key: 'database',    label: 'Database',    icon: '🗄️' },
  { key: 'realtime',    label: 'Real-time',   icon: '📡' },
  { key: 'backend',     label: 'Backend',     icon: '🌐' },
  { key: 'media',       label: 'Media',       icon: '🎬' },
  { key: 'components',  label: 'Components',  icon: '🧊' },
  { key: 'animation',   label: 'Animation',   icon: '✨' },
  { key: 'permissions', label: 'Permissions', icon: '🔐' },
  { key: 'functions',   label: 'Functions',   icon: '🧩' },
  { key: 'effects',     label: 'Effects',     icon: '💫' },
  { key: 'auth',        label: 'Auth',        icon: '🔐' },
  { key: 'advanced',    label: 'Advanced',    icon: '💻' },
];

export type ThemeMode = 'light' | 'dark' | 'glass';

/** Helper to build inline styles from BlockStyle + BlockLayout */
export function buildBlockInlineStyle(style?: BlockStyle, layout?: BlockLayout): React.CSSProperties {
  const css: React.CSSProperties = {};
  if (!style && !layout) return css;

  if (style) {
    if (style.backgroundColor) css.backgroundColor = style.backgroundColor;
    if (style.textColor) css.color = style.textColor;
    if (style.fontSize) css.fontSize = `${style.fontSize}px`;
    if (style.fontWeight) css.fontWeight = style.fontWeight;
    if (style.fontFamily) css.fontFamily = style.fontFamily;
    if (style.borderWidth) css.borderWidth = `${style.borderWidth}px`;
    if (style.borderColor) css.borderColor = style.borderColor;
    if (style.borderRadius != null) css.borderRadius = `${style.borderRadius}px`;
    if (style.opacity != null) css.opacity = style.opacity;
    if (style.shadowX != null || style.shadowY != null || style.shadowBlur != null) {
      css.boxShadow = `${style.shadowX || 0}px ${style.shadowY || 0}px ${style.shadowBlur || 0}px ${style.shadowColor || 'rgba(0,0,0,0.2)'}`;
    }
    if (style.gradientFrom && style.gradientTo) {
      css.background = `linear-gradient(${style.gradientDirection || '135deg'}, ${style.gradientFrom}, ${style.gradientTo})`;
    }
    if (style.backgroundImage) {
      css.backgroundImage = `url(${style.backgroundImage})`;
      css.backgroundSize = 'cover';
      css.backgroundPosition = 'center';
    }
  }

  if (layout) {
    if (layout.position) css.position = layout.position;
    if (layout.width) css.width = layout.width;
    if (layout.height) css.height = layout.height;
    if (layout.minWidth) css.minWidth = layout.minWidth;
    if (layout.maxWidth) css.maxWidth = layout.maxWidth;
    if (layout.minHeight) css.minHeight = layout.minHeight;
    if (layout.maxHeight) css.maxHeight = layout.maxHeight;
    if (layout.marginTop != null) css.marginTop = `${layout.marginTop}px`;
    if (layout.marginRight != null) css.marginRight = `${layout.marginRight}px`;
    if (layout.marginBottom != null) css.marginBottom = `${layout.marginBottom}px`;
    if (layout.marginLeft != null) css.marginLeft = `${layout.marginLeft}px`;
    if (layout.paddingTop != null) css.paddingTop = `${layout.paddingTop}px`;
    if (layout.paddingRight != null) css.paddingRight = `${layout.paddingRight}px`;
    if (layout.paddingBottom != null) css.paddingBottom = `${layout.paddingBottom}px`;
    if (layout.paddingLeft != null) css.paddingLeft = `${layout.paddingLeft}px`;
    if (layout.zIndex != null) css.zIndex = layout.zIndex;
    if (layout.rotation) css.transform = `rotate(${layout.rotation}deg)${layout.scale ? ` scale(${layout.scale})` : ''}`;
    else if (layout.scale) css.transform = `scale(${layout.scale})`;
    if (layout.gap != null) css.gap = `${layout.gap}px`;
    if (layout.overflow) css.overflow = layout.overflow;
  }

  return css;
}
