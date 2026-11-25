import { ProjectData } from '@/types/blocks';

export interface Template {
  name: string;
  icon: string;
  description: string;
  category: 'starter' | 'tools' | 'games' | 'auth' | 'api';
  data: ProjectData;
}

export const TEMPLATES: Template[] = [
  {
    name: 'Counter',
    icon: '🔢',
    description: 'A simple +1 counter with display',
    category: 'starter',
    data: {
      id: 'tpl_counter', name: 'Counter',
      blocks: [
        { id: 'b1', type: 'variable', label: 'Variable', props: { name: 'count', value: '0' }, x: 20, y: 20, connections: [] },
        { id: 'b2', type: 'display', label: 'Display', props: { value: '0' }, x: 20, y: 100, connections: [] },
        { id: 'b3', type: 'math', label: 'Add', props: { op: '+', a: 'count', b: '1' }, x: 20, y: 180, connections: ['b2', 'b1'] },
        { id: 'b4', type: 'button', label: 'Button', props: { text: 'Count +1', event: 'click' }, x: 20, y: 280, connections: ['b3'] },
      ],
      createdAt: Date.now(), updatedAt: Date.now(),
    },
  },
  {
    name: 'Calculator',
    icon: '🧮',
    description: 'Add two numbers together',
    category: 'starter',
    data: {
      id: 'tpl_calc', name: 'Calculator',
      blocks: [
        { id: 'c1', type: 'input', label: 'Input', props: { placeholder: 'Number A', value: '' }, x: 20, y: 20, connections: [] },
        { id: 'c2', type: 'input', label: 'Input', props: { placeholder: 'Number B', value: '' }, x: 20, y: 100, connections: [] },
        { id: 'c3', type: 'math', label: 'Add', props: { op: '+', a: '0', b: '0' }, x: 20, y: 180, connections: ['c5'] },
        { id: 'c4', type: 'button', label: 'Button', props: { text: 'Calculate', event: 'click' }, x: 20, y: 270, connections: ['c3'] },
        { id: 'c5', type: 'display', label: 'Display', props: { value: '0' }, x: 20, y: 350, connections: [] },
      ],
      createdAt: Date.now(), updatedAt: Date.now(),
    },
  },
  {
    name: 'Notes App',
    icon: '📝',
    description: 'Type and save a note',
    category: 'starter',
    data: {
      id: 'tpl_notes', name: 'Notes',
      blocks: [
        { id: 'n1', type: 'text', label: 'Text', props: { text: '📝 My Notes' }, x: 20, y: 20, connections: [] },
        { id: 'n2', type: 'input', label: 'Input', props: { placeholder: 'Write a note...', value: '' }, x: 20, y: 80, connections: [] },
        { id: 'n3', type: 'variable', label: 'Variable', props: { name: 'note', value: '' }, x: 20, y: 160, connections: [] },
        { id: 'n4', type: 'button', label: 'Button', props: { text: 'Save Note', event: 'click' }, x: 20, y: 240, connections: ['n3', 'n2', 'n6'] },
        { id: 'n5', type: 'display', label: 'Display', props: { value: 'No note yet' }, x: 20, y: 320, connections: [] },
        { id: 'n6', type: 'alert', label: 'Alert', props: { message: 'Note saved!' }, x: 200, y: 240, connections: [] },
      ],
      createdAt: Date.now(), updatedAt: Date.now(),
    },
  },
  {
    name: 'Greeter',
    icon: '👋',
    description: 'Enter name and get greeted',
    category: 'starter',
    data: {
      id: 'tpl_greet', name: 'Greeter',
      blocks: [
        { id: 'g1', type: 'text', label: 'Text', props: { text: 'Enter your name:' }, x: 20, y: 20, connections: [] },
        { id: 'g2', type: 'input', label: 'Input', props: { placeholder: 'Your name...', value: '' }, x: 20, y: 80, connections: [] },
        { id: 'g3', type: 'button', label: 'Button', props: { text: 'Say Hello!', event: 'click' }, x: 20, y: 160, connections: ['g4'] },
        { id: 'g4', type: 'alert', label: 'Alert', props: { message: 'Hello there! 👋' }, x: 20, y: 240, connections: [] },
      ],
      createdAt: Date.now(), updatedAt: Date.now(),
    },
  },
  {
    name: 'Timer',
    icon: '⏱️',
    description: 'Countdown timer with start/stop',
    category: 'tools',
    data: {
      id: 'tpl_timer', name: 'Timer',
      blocks: [
        { id: 't1', type: 'text', label: 'Text', props: { text: '⏱️ Countdown Timer' }, x: 20, y: 20, connections: [] },
        { id: 't2', type: 'variable', label: 'Variable', props: { name: 'seconds', value: '10', varType: 'number' }, x: 20, y: 80, connections: [] },
        { id: 't3', type: 'display', label: 'Display', props: { value: '10' }, x: 20, y: 160, connections: [] },
        { id: 't4', type: 'math', label: 'Subtract', props: { op: '-', a: 'seconds', b: '1' }, x: 20, y: 240, connections: ['t3', 't2'] },
        { id: 't5', type: 'timer', label: 'Wait 1s', props: { delay: 1000 }, x: 20, y: 320, connections: ['t4'] },
        { id: 't6', type: 'condition', label: 'If > 0', props: { left: 'seconds', op: '>', right: '0' }, x: 20, y: 400, connections: ['t5'] },
        { id: 't7', type: 'button', label: 'Button', props: { text: '▶ Start Timer', event: 'click' }, x: 20, y: 480, connections: ['t6'] },
        { id: 't8', type: 'alert', label: 'Alert', props: { message: "Time's up! ⏰" }, x: 200, y: 400, connections: [] },
      ],
      createdAt: Date.now(), updatedAt: Date.now(),
    },
  },
  {
    name: 'Mini Quiz',
    icon: '🧠',
    description: 'Simple quiz with score tracking',
    category: 'games',
    data: {
      id: 'tpl_quiz', name: 'Mini Quiz',
      blocks: [
        { id: 'q1', type: 'text', label: 'Text', props: { text: '🧠 What is 7 × 8?' }, x: 20, y: 20, connections: [] },
        { id: 'q2', type: 'input', label: 'Input', props: { placeholder: 'Your answer...', value: '' }, x: 20, y: 80, connections: [] },
        { id: 'q3', type: 'variable', label: 'Variable', props: { name: 'score', value: '0', varType: 'number' }, x: 20, y: 160, connections: [] },
        { id: 'q4', type: 'variable', label: 'Variable', props: { name: 'answer', value: '' }, x: 200, y: 160, connections: [] },
        { id: 'q5', type: 'condition', label: 'If == 56', props: { left: 'answer', op: '==', right: '56' }, x: 20, y: 240, connections: ['q6', 'q7'] },
        { id: 'q6', type: 'alert', label: 'Alert', props: { message: '✅ Correct! +1 point' }, x: 20, y: 320, connections: [] },
        { id: 'q7', type: 'alert', label: 'Alert', props: { message: '❌ Wrong! The answer is 56' }, x: 200, y: 320, connections: [] },
        { id: 'q8', type: 'button', label: 'Button', props: { text: 'Check Answer', event: 'click' }, x: 20, y: 400, connections: ['q4', 'q5'] },
        { id: 'q9', type: 'display', label: 'Display', props: { value: 'Score: 0' }, x: 20, y: 480, connections: [] },
      ],
      createdAt: Date.now(), updatedAt: Date.now(),
    },
  },
  // ---- Auth Templates ----
  {
    name: 'Login Screen',
    icon: '🔑',
    description: 'Pre-wired email/password login with register link',
    category: 'auth',
    data: {
      id: 'tpl_login', name: 'Login App',
      blocks: [
        { id: 'ls_screen', type: 'screen', label: 'Screen', props: { screenName: 'Login' }, x: 20, y: 20, connections: ['ls_title', 'ls_email', 'ls_pass', 'ls_login_btn', 'ls_err', 'ls_reg_btn', 'ls_forgot_btn'] },
        { id: 'ls_title', type: 'text', label: 'Text', props: { text: '🔑 Sign In' }, x: 20, y: 90, connections: [], screenId: 'Login' },
        { id: 'ls_email', type: 'input', label: 'Input', props: { placeholder: 'Email', label: 'Email', inputType: 'email', required: true }, x: 20, y: 160, connections: [], screenId: 'Login' },
        { id: 'ls_pass', type: 'input', label: 'Input', props: { placeholder: 'Password', label: 'Password', inputType: 'password', required: true }, x: 20, y: 240, connections: [], screenId: 'Login' },
        { id: 'ls_err', type: 'display', label: 'Display', props: { value: '' }, x: 20, y: 310, connections: [], screenId: 'Login' },
        { id: 'ls_auth', type: 'authLogin', label: 'Login', props: { emailVar: 'ls_email', passwordVar: 'ls_pass', resultVar: '_authUser', errorVar: '_authError' }, x: 20, y: 380, connections: ['ls_ok', 'ls_err_show'] },
        { id: 'ls_ok', type: 'alert', label: 'Alert', props: { message: 'Welcome back! ✅' }, x: 20, y: 460, connections: [] },
        { id: 'ls_err_show', type: 'variable', label: 'Variable', props: { name: '_displayError', value: '' }, x: 220, y: 460, connections: [] },
        { id: 'ls_login_btn', type: 'button', label: 'Button', props: { text: '🔑 Sign In' }, x: 20, y: 540, connections: ['ls_auth'], screenId: 'Login' },
        // Register screen
        { id: 'rs_screen', type: 'screen', label: 'Screen', props: { screenName: 'Register' }, x: 400, y: 20, connections: ['rs_title', 'rs_email', 'rs_pass', 'rs_reg_btn', 'rs_err', 'rs_back_btn'] },
        { id: 'rs_title', type: 'text', label: 'Text', props: { text: '📝 Create Account' }, x: 400, y: 90, connections: [], screenId: 'Register' },
        { id: 'rs_email', type: 'input', label: 'Input', props: { placeholder: 'Email', label: 'Email', inputType: 'email', required: true }, x: 400, y: 160, connections: [], screenId: 'Register' },
        { id: 'rs_pass', type: 'input', label: 'Input', props: { placeholder: 'Password (min 6 chars)', label: 'Password', inputType: 'password', required: true, minLength: '6' }, x: 400, y: 240, connections: [], screenId: 'Register' },
        { id: 'rs_err', type: 'display', label: 'Display', props: { value: '' }, x: 400, y: 310, connections: [], screenId: 'Register' },
        { id: 'rs_auth', type: 'authRegister', label: 'Register', props: { emailVar: 'rs_email', passwordVar: 'rs_pass', resultVar: '_authUser', errorVar: '_authError' }, x: 400, y: 380, connections: ['rs_ok'] },
        { id: 'rs_ok', type: 'alert', label: 'Alert', props: { message: 'Account created! Check your email to confirm. 📧' }, x: 400, y: 460, connections: [] },
        { id: 'rs_reg_btn', type: 'button', label: 'Button', props: { text: '📝 Register' }, x: 400, y: 540, connections: ['rs_auth'], screenId: 'Register' },
        { id: 'rs_back_btn', type: 'navigateTo', label: 'Navigate', props: { targetScreen: 'Login' }, x: 560, y: 540, connections: [], screenId: 'Register' },
        // Navigation buttons on Login screen
        { id: 'ls_reg_btn', type: 'navigateTo', label: 'Navigate', props: { targetScreen: 'Register' }, x: 220, y: 540, connections: [], screenId: 'Login' },
        { id: 'ls_forgot_btn', type: 'navigateTo', label: 'Navigate', props: { targetScreen: 'ForgotPassword' }, x: 220, y: 610, connections: [], screenId: 'Login' },
        // Forgot Password screen
        { id: 'fp_screen', type: 'screen', label: 'Screen', props: { screenName: 'ForgotPassword' }, x: 750, y: 20, connections: ['fp_title', 'fp_email', 'fp_btn', 'fp_back'] },
        { id: 'fp_title', type: 'text', label: 'Text', props: { text: '🔒 Reset Password' }, x: 750, y: 90, connections: [], screenId: 'ForgotPassword' },
        { id: 'fp_email', type: 'input', label: 'Input', props: { placeholder: 'Enter your email', label: 'Email', inputType: 'email' }, x: 750, y: 160, connections: [], screenId: 'ForgotPassword' },
        { id: 'fp_auth', type: 'authForgotPassword', label: 'Forgot Password', props: { emailVar: 'fp_email', resultVar: '_authResult', errorVar: '_authError' }, x: 750, y: 240, connections: ['fp_ok'] },
        { id: 'fp_ok', type: 'alert', label: 'Alert', props: { message: 'Reset link sent! Check your email 📧' }, x: 750, y: 320, connections: [] },
        { id: 'fp_btn', type: 'button', label: 'Button', props: { text: '🔒 Send Reset Link' }, x: 750, y: 400, connections: ['fp_auth'], screenId: 'ForgotPassword' },
        { id: 'fp_back', type: 'navigateTo', label: 'Navigate', props: { targetScreen: 'Login' }, x: 910, y: 400, connections: [], screenId: 'ForgotPassword' },
      ],
      screens: ['Login', 'Register', 'ForgotPassword'],
      activeScreen: 'Login',
      createdAt: Date.now(), updatedAt: Date.now(),
    },
  },
  // ---- API Template ----
  {
    name: 'REST API Fetcher',
    icon: '🌐',
    description: 'Fetch data from any REST API',
    category: 'api',
    data: {
      id: 'tpl_api', name: 'API Fetcher',
      blocks: [
        { id: 'api_url', type: 'input', label: 'Input', props: { placeholder: 'https://jsonplaceholder.typicode.com/posts/1', label: 'API URL' }, x: 20, y: 20, connections: [] },
        { id: 'api_var', type: 'variable', label: 'Variable', props: { name: 'apiUrl', value: 'https://jsonplaceholder.typicode.com/posts/1' }, x: 20, y: 100, connections: [] },
        { id: 'api_req', type: 'apiRequest', label: 'API Request', props: { url: 'https://jsonplaceholder.typicode.com/posts/1', method: 'GET', resultVar: '_response', headers: '{}', body: '' }, x: 20, y: 180, connections: ['api_disp'] },
        { id: 'api_disp', type: 'display', label: 'Display', props: { value: 'Response will appear here' }, x: 20, y: 280, connections: [] },
        { id: 'api_btn', type: 'button', label: 'Button', props: { text: '🌐 Send Request' }, x: 20, y: 370, connections: ['api_req'] },
      ],
      createdAt: Date.now(), updatedAt: Date.now(),
    },
  },
];

export const TEMPLATE_CATEGORIES = [
  { key: 'starter', label: 'Starter', icon: '🌱' },
  { key: 'tools', label: 'Tools', icon: '🛠️' },
  { key: 'games', label: 'Games', icon: '🎮' },
  { key: 'auth', label: 'Auth', icon: '🔐' },
  { key: 'api', label: 'API', icon: '🌐' },
] as const;
