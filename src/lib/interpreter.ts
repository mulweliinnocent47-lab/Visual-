/**
 * V6 Logic Interpreter — real-time, database, media, animations, permissions
 */

import { Block } from '@/types/blocks';
import { appEventBus, EVENTS } from './eventBus';
import { supabase } from '@/integrations/supabase/client';

export type VarValue = string | number | boolean | VarValue[];

export interface ExecutionState {
  variables: Record<string, VarValue>;
  inputValues: Record<string, string>;
  displayValues: Record<string, string>;
  alerts: string[];
  activeBlockId: string | null;
  executionLog: string[];
  stopped: boolean;
  functions: Record<string, { params: string[]; bodyConnections: string[] }>;
  currentScreen: string;
  screenStack: string[];
  stepCount: number;
  executionTimeMs: number;
}

export interface InterpreterCallbacks {
  onStateChange: (state: ExecutionState) => void;
  onBlockActivate: (blockId: string | null) => void;
  onAlert: (msg: string) => void;
}

export interface InterpreterOptions {
  /** Resolve waits and timers immediately instead of really waiting. Used by automatic checks. */
  instant?: boolean;
  /** Do not touch the shared event bus or open real-time channels. Lets a check run beside a live preview. */
  isolated?: boolean;
}

const MAX_LOOP_ITERATIONS = 1000;
const MAX_EXECUTION_STEPS = 5000;

class BreakSignal { }
class ContinueSignal { }
class StopSignal { }

export class Interpreter {
  private state: ExecutionState;
  private blocks: Block[];
  private callbacks: InterpreterCallbacks;
  private timers: number[] = [];
  private slowMode = false;
  private slowDelay = 400;
  private startTime = 0;
  private realtimeChannels: any[] = [];
  private options: InterpreterOptions;

  constructor(blocks: Block[], callbacks: InterpreterCallbacks, slowMode = false, options: InterpreterOptions = {}) {
    this.blocks = blocks;
    this.callbacks = callbacks;
    this.slowMode = slowMode;
    this.options = options;

    const vars: Record<string, VarValue> = {};
    blocks.filter(b => b.type === 'variable' || b.type === 'globalState' || b.type === 'reactiveVar').forEach(b => {
      vars[b.props.name] = this.parseInitialValue(b.props.value, b.props.varType || 'text');
    });
    blocks.filter(b => b.type === 'listCreate').forEach(b => { vars[b.props.name] = []; });

    const displayVals: Record<string, string> = {};
    blocks.filter(b => b.type === 'display').forEach(b => { displayVals[b.id] = b.props.value; });

    const functions: Record<string, { params: string[]; bodyConnections: string[] }> = {};
    blocks.filter(b => b.type === 'functionDef').forEach(b => {
      functions[b.props.name] = {
        params: (b.props.params || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        bodyConnections: b.connections,
      };
    });

    const screens = blocks.filter(b => b.type === 'screen');
    const defaultScreen = screens.length > 0 ? screens[0].props.screenName || 'Main' : 'Main';

    this.state = {
      variables: vars, inputValues: {}, displayValues: displayVals, alerts: [],
      activeBlockId: null, executionLog: [], stopped: false, functions,
      currentScreen: defaultScreen, screenStack: [defaultScreen],
      stepCount: 0, executionTimeMs: 0,
    };
  }

  private parseInitialValue(val: string, varType: string): VarValue {
    switch (varType) {
      case 'number': return parseFloat(val) || 0;
      case 'boolean': return val === 'true';
      case 'list': return [];
      default: return val;
    }
  }

  private resolve(val: string): VarValue {
    if (this.state.variables[val] !== undefined) return this.state.variables[val];
    const inputBlock = this.blocks.find(b => b.type === 'input' && b.id === val);
    if (inputBlock) return this.state.inputValues[val] || '';
    return val;
  }

  private resolveStr(val: string): string {
    const r = this.resolve(val);
    if (Array.isArray(r)) return JSON.stringify(r);
    return String(r);
  }

  private resolveNum(val: string): number {
    return parseFloat(String(this.resolve(val))) || 0;
  }

  private emitState() {
    this.state.executionTimeMs = Date.now() - this.startTime;
    this.callbacks.onStateChange({ ...this.state });
  }

  private async activateBlock(blockId: string) {
    this.state.activeBlockId = blockId;
    this.callbacks.onBlockActivate(blockId);
    this.emitState();
    if (this.slowMode) await this.delay(this.slowDelay);
  }

  private delay(ms: number): Promise<void> {
    if (this.options.instant) return Promise.resolve();
    return new Promise(res => { const t = window.setTimeout(res, ms); this.timers.push(t); });
  }

  private guardStep() {
    this.state.stepCount++;
    if (this.state.stepCount > MAX_EXECUTION_STEPS) throw new Error('Execution limit reached');
    if (this.state.stopped) throw new StopSignal();
  }

  async start() {
    this.startTime = Date.now();
    if (!this.options.isolated) appEventBus.emit(EVENTS.APP_START);

    // Set up real-time subscriptions
    const realtimeBlocks = this.options.isolated ? [] : this.blocks;
    realtimeBlocks.filter(b => b.type === 'realtimeSubscribe').forEach(block => {
      const channel = supabase.channel(block.props.channel || 'default');
      channel.on('broadcast', { event: block.props.event || 'message' }, (payload: any) => {
        this.state.variables[block.props.resultVar || '_msg'] = JSON.stringify(payload.payload || '');
        this.state.executionLog.push(`📡 Received: ${block.props.event}`);
        this.emitState();
        this.executeConnections(block).catch(() => {});
      }).subscribe();
      this.realtimeChannels.push(channel);
    });

    // Set up presence
    realtimeBlocks.filter(b => b.type === 'presenceBlock').forEach(block => {
      const channel = supabase.channel(block.props.channel || 'lobby');
      channel.on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        this.state.variables[block.props.statusVar || '_users'] = JSON.stringify(Object.keys(presenceState));
        this.emitState();
      }).subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online: true, joined: Date.now() });
        }
      });
      this.realtimeChannels.push(channel);
    });

    const onStartBlocks = this.blocks.filter(b => b.type === 'onStart');
    for (const b of onStartBlocks) { await this.executeConnections(b); }
    this.state.activeBlockId = null;
    this.emitState();
  }

  async handleButtonClick(blockId: string) {
    const block = this.blocks.find(b => b.id === blockId);
    if (!block) return;
    if (!this.options.isolated) appEventBus.emit(EVENTS.BUTTON_CLICK, blockId);
    this.state.stepCount = 0;
    this.startTime = Date.now();
    try { await this.executeConnections(block); }
    catch (e) { if (!(e instanceof StopSignal) && e instanceof Error) this.state.executionLog.push(`❌ ${e.message}`); }
    this.state.activeBlockId = null;
    this.emitState();
  }

  handleInputChange(blockId: string, value: string) {
    this.state.inputValues[blockId] = value;
    if (!this.options.isolated) appEventBus.emit(EVENTS.INPUT_CHANGE, blockId, value);
    this.emitState();
  }

  private async executeConnections(block: Block) {
    for (const cId of block.connections) {
      this.guardStep();
      const connected = this.blocks.find(b => b.id === cId);
      if (connected) await this.executeBlock(connected, block);
    }
  }

  private async executeBlock(block: Block, trigger?: Block) {
    await this.activateBlock(block.id);
    this.guardStep();

    switch (block.type) {
      case 'math': {
        const a = this.resolveNum(block.props.a);
        const b = this.resolveNum(block.props.b);
        let result = 0;
        switch (block.props.op) {
          case '+': result = a + b; break; case '-': result = a - b; break;
          case '×': result = a * b; break; case '÷': result = b !== 0 ? a / b : 0; break;
        }
        for (const dId of block.connections) {
          const d = this.blocks.find(bl => bl.id === dId);
          if (d?.type === 'display') this.state.displayValues[dId] = String(result);
          if (d?.type === 'variable') this.state.variables[d.props.name] = result;
        }
        this.emitState(); break;
      }
      case 'variable': {
        if (trigger) {
          const inputConn = trigger.connections.find(id => this.blocks.find(b => b.id === id)?.type === 'input');
          if (inputConn) { this.state.variables[block.props.name] = this.state.inputValues[inputConn] || ''; }
        }
        this.emitState(); break;
      }
      case 'display': {
        if (trigger) {
          const varBlock = this.blocks.find(b => b.type === 'variable' && trigger.connections.includes(b.id));
          if (varBlock) this.state.displayValues[block.id] = String(this.state.variables[varBlock.props.name] ?? '0');
        }
        this.emitState(); break;
      }
      case 'alert': {
        const msg = block.props.message || 'Alert!';
        this.state.alerts.push(msg);
        this.callbacks.onAlert(msg);
        this.emitState(); break;
      }
      case 'timer': { await this.delay(block.props.delay || 1000); await this.executeConnections(block); break; }
      case 'wait': { await this.delay((block.props.seconds || 1) * 1000); await this.executeConnections(block); break; }
      case 'condition': {
        const l = this.resolveStr(block.props.left), r = this.resolveStr(block.props.right);
        let p = false;
        switch (block.props.op) { case '==': p = l === r; break; case '!=': p = l !== r; break; case '>': p = parseFloat(l) > parseFloat(r); break; case '<': p = parseFloat(l) < parseFloat(r); break; }
        if (p) await this.executeConnections(block); break;
      }
      case 'ifElse': {
        const l = this.resolveStr(block.props.left), r = this.resolveStr(block.props.right);
        let p = false;
        switch (block.props.op) { case '==': p = l === r; break; case '!=': p = l !== r; break; case '>': p = parseFloat(l) > parseFloat(r); break; case '<': p = parseFloat(l) < parseFloat(r); break; }
        if (p && block.connections[0]) { const b = this.blocks.find(b => b.id === block.connections[0]); if (b) await this.executeBlock(b, block); }
        else if (!p && block.connections[1]) { const b = this.blocks.find(b => b.id === block.connections[1]); if (b) await this.executeBlock(b, block); }
        break;
      }
      case 'repeat': {
        const times = Math.min(this.resolveNum(block.props.times || '5'), MAX_LOOP_ITERATIONS);
        for (let i = 0; i < times; i++) { this.guardStep(); this.state.variables['_i'] = i; try { await this.executeConnections(block); } catch (e) { if (e instanceof BreakSignal) break; if (e instanceof ContinueSignal) continue; throw e; } }
        break;
      }
      case 'whileLoop': {
        let it = 0;
        while (it < MAX_LOOP_ITERATIONS) { this.guardStep(); const l = this.resolveStr(block.props.left), r = this.resolveStr(block.props.right); let p = false; switch (block.props.op) { case '==': p = l === r; break; case '!=': p = l !== r; break; case '>': p = parseFloat(l) > parseFloat(r); break; case '<': p = parseFloat(l) < parseFloat(r); break; } if (!p) break; try { await this.executeConnections(block); } catch (e) { if (e instanceof BreakSignal) break; if (e instanceof ContinueSignal) { it++; continue; } throw e; } it++; }
        break;
      }
      case 'forLoop': {
        const start = this.resolveNum(block.props.start || '0'), end = this.resolveNum(block.props.end || '10'), step = this.resolveNum(block.props.step || '1') || 1;
        let it = 0; for (let i = start; step > 0 ? i < end : i > end; i += step) { if (it++ > MAX_LOOP_ITERATIONS) break; this.guardStep(); this.state.variables[block.props.varName || '_i'] = i; try { await this.executeConnections(block); } catch (e) { if (e instanceof BreakSignal) break; if (e instanceof ContinueSignal) continue; throw e; } }
        break;
      }
      case 'breakLoop': throw new BreakSignal();
      case 'continueLoop': throw new ContinueSignal();
      case 'stopExec': this.state.stopped = true; throw new StopSignal();
      case 'listAdd': {
        const list = this.state.variables[block.props.listName]; if (Array.isArray(list)) { list.push(this.resolveStr(block.props.item || '')); this.state.variables[block.props.listName] = [...list]; }
        this.emitState(); await this.executeConnections(block); break;
      }
      case 'listRemove': {
        const list = this.state.variables[block.props.listName]; if (Array.isArray(list)) { list.splice(this.resolveNum(block.props.index || '0'), 1); this.state.variables[block.props.listName] = [...list]; }
        this.emitState(); await this.executeConnections(block); break;
      }
      case 'listGet': {
        const list = this.state.variables[block.props.listName]; let val = '';
        if (Array.isArray(list) && list[this.resolveNum(block.props.index || '0')] !== undefined) val = String(list[this.resolveNum(block.props.index || '0')]);
        for (const dId of block.connections) { const d = this.blocks.find(bl => bl.id === dId); if (d?.type === 'display') this.state.displayValues[dId] = val; if (d?.type === 'variable') this.state.variables[d.props.name] = val; }
        this.emitState(); break;
      }
      case 'functionCall': {
        const fn = this.state.functions[block.props.name || ''];
        if (fn) { const args = (block.props.args || '').split(',').map((s: string) => s.trim()); fn.params.forEach((p, i) => { this.state.variables[p] = args[i] !== undefined ? this.resolve(args[i]) : ''; }); for (const cId of fn.bodyConnections) { const c = this.blocks.find(b => b.id === cId); if (c) await this.executeBlock(c, block); } }
        break;
      }
      case 'navigateTo': {
        const target = block.props.targetScreen || 'Main';
        this.state.screenStack.push(this.state.currentScreen); this.state.currentScreen = target;
        this.state.executionLog.push(`📱 Navigate → ${target}`); this.emitState(); await this.executeConnections(block); break;
      }
      case 'goBack': {
        if (this.state.screenStack.length > 1) { this.state.screenStack.pop(); this.state.currentScreen = this.state.screenStack[this.state.screenStack.length - 1]; this.state.executionLog.push(`⬅️ Back → ${this.state.currentScreen}`); }
        this.emitState(); await this.executeConnections(block); break;
      }
      case 'apiRequest': {
        const url = this.resolveStr(block.props.url || ''); const method = block.props.method || 'GET';
        try {
          let parsedHeaders: Record<string, string> = {};
          if (block.props.headers) {
            try {
              const h = JSON.parse(block.props.headers);
              if (h && typeof h === 'object' && !Array.isArray(h)) { parsedHeaders = h; } else { this.state.executionLog.push('⚠️ Headers must be a JSON object'); }
            } catch { this.state.executionLog.push('⚠️ Invalid headers JSON'); }
          }
          const resp = await fetch(url, { method, headers: parsedHeaders, body: method !== 'GET' && block.props.body ? block.props.body : undefined });
          const data = await resp.text(); const targetVar = block.props.resultVar || '_response';
          try { this.state.variables[targetVar] = JSON.parse(data); } catch { this.state.variables[targetVar] = data; }
          this.state.executionLog.push(`🌐 ${method} ${url} → ${resp.status}`);
        } catch { this.state.executionLog.push(`❌ API Error: Request failed`); }
        this.emitState(); await this.executeConnections(block); break;
      }
      case 'localStorage': {
        const action = block.props.action || 'get'; const key = this.resolveStr(block.props.key || 'data');
        if (action === 'set') { window.localStorage.setItem(`tydarsu_user_${key}`, this.resolveStr(block.props.value || '')); this.state.executionLog.push(`💾 Saved: ${key}`); }
        else { const stored = window.localStorage.getItem(`tydarsu_user_${key}`) || ''; this.state.variables[block.props.resultVar || key] = stored; this.state.executionLog.push(`💾 Loaded: ${key}`); }
        this.emitState(); await this.executeConnections(block); break;
      }
      // V6 Real-time publish
      case 'realtimePublish': {
        const channel = supabase.channel(block.props.channel || 'default');
        const payload = this.resolveStr(block.props.payload || '');
        await channel.send({ type: 'broadcast', event: block.props.event || 'message', payload: { data: payload } });
        this.state.executionLog.push(`📤 Published to ${block.props.channel}:${block.props.event}`);
        this.emitState(); await this.executeConnections(block); break;
      }
      // V6 Database CRUD (simulated via in-memory collections)
      case 'dbCreate': {
        const coll = block.props.collection || 'items';
        let data: any = {};
        try { const parsed = JSON.parse(this.resolveStr(block.props.data || '{}')); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed; } catch { this.state.executionLog.push('⚠️ Invalid data JSON for dbCreate'); }
        const existing = this.state.variables[`_db_${coll}`];
        const list = Array.isArray(existing) ? [...existing] : [];
        const record = { id: `rec_${Date.now()}`, ...data };
        list.push(JSON.stringify(record));
        this.state.variables[`_db_${coll}`] = list;
        this.state.executionLog.push(`➕ Created record in ${coll}`);
        this.emitState(); await this.executeConnections(block); break;
      }
      case 'dbRead': {
        const coll = block.props.collection || 'items'; const id = this.resolveStr(block.props.id || '');
        const list = this.state.variables[`_db_${coll}`];
        let found = '';
        if (Array.isArray(list)) {
          const item = list.find(r => { try { return JSON.parse(String(r)).id === id; } catch { return false; } });
          if (item) found = String(item);
        }
        this.state.variables[block.props.resultVar || '_record'] = found;
        this.state.executionLog.push(`📖 Read from ${coll}`);
        this.emitState(); await this.executeConnections(block); break;
      }
      case 'dbUpdate': {
        const coll = block.props.collection || 'items'; const id = this.resolveStr(block.props.id || '');
        let updateData: any = {}; try { const parsed = JSON.parse(this.resolveStr(block.props.data || '{}')); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) updateData = parsed; } catch { this.state.executionLog.push('⚠️ Invalid data JSON for dbUpdate'); }
        const list = this.state.variables[`_db_${coll}`];
        if (Array.isArray(list)) {
          const idx = list.findIndex(r => { try { return JSON.parse(String(r)).id === id; } catch { return false; } });
          if (idx >= 0) { const existing = JSON.parse(String(list[idx])); list[idx] = JSON.stringify({ ...existing, ...updateData }); this.state.variables[`_db_${coll}`] = [...list]; }
        }
        this.state.executionLog.push(`✏️ Updated record in ${coll}`);
        this.emitState(); await this.executeConnections(block); break;
      }
      case 'dbDelete': {
        const coll = block.props.collection || 'items'; const id = this.resolveStr(block.props.id || '');
        const list = this.state.variables[`_db_${coll}`];
        if (Array.isArray(list)) {
          const filtered = list.filter(r => { try { return JSON.parse(String(r)).id !== id; } catch { return true; } });
          this.state.variables[`_db_${coll}`] = filtered;
        }
        this.state.executionLog.push(`🗑️ Deleted from ${coll}`);
        this.emitState(); await this.executeConnections(block); break;
      }
      case 'dbQuery': {
        const coll = block.props.collection || 'items';
        const list = this.state.variables[`_db_${coll}`];
        let results = Array.isArray(list) ? [...list] : [];
        // Apply filter
        const filter = this.resolveStr(block.props.filter || '');
        if (filter && filter.includes('=')) {
          const [fKey, fVal] = filter.split('=').map(s => s.trim());
          results = results.filter(r => { try { return JSON.parse(String(r))[fKey] == fVal; } catch { return false; } });
        }
        // Apply limit
        const limit = parseInt(block.props.limit || '10') || 10;
        results = results.slice(0, limit);
        this.state.variables[block.props.resultVar || '_results'] = results;
        this.state.executionLog.push(`🔎 Queried ${coll}: ${results.length} results`);
        this.emitState(); await this.executeConnections(block); break;
      }
      // V6 Permissions
      case 'permLocation': {
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
          this.state.variables[block.props.resultVar || '_location'] = `${pos.coords.latitude},${pos.coords.longitude}`;
          this.state.executionLog.push(`📍 Location: ${pos.coords.latitude}, ${pos.coords.longitude}`);
        } catch { this.state.executionLog.push(`📍 Location denied`); this.state.variables[block.props.resultVar || '_location'] = 'denied'; }
        this.emitState(); await this.executeConnections(block); break;
      }
      case 'permCamera': {
        try { await navigator.mediaDevices.getUserMedia({ video: true }); this.state.variables[block.props.resultVar || '_cameraGranted'] = 'true'; this.state.executionLog.push('📷 Camera granted'); }
        catch { this.state.variables[block.props.resultVar || '_cameraGranted'] = 'false'; this.state.executionLog.push('📷 Camera denied'); }
        this.emitState(); await this.executeConnections(block); break;
      }
      case 'permNotification': {
        try { const perm = await Notification.requestPermission(); this.state.variables[block.props.resultVar || '_notifGranted'] = perm; this.state.executionLog.push(`🔔 Notification: ${perm}`); }
        catch { this.state.variables[block.props.resultVar || '_notifGranted'] = 'denied'; }
        this.emitState(); await this.executeConnections(block); break;
      }
      // V6 Reactive var - set and trigger onChange
      case 'reactiveVar': {
        if (trigger) {
          const inputConn = trigger.connections.find(id => this.blocks.find(b => b.id === id)?.type === 'input');
          if (inputConn) { this.state.variables[block.props.name] = this.state.inputValues[inputConn] || ''; }
          // Trigger onChange connections
          if (block.props.onChange) {
            const targetBlock = this.blocks.find(b => b.id === block.props.onChange);
            if (targetBlock) await this.executeBlock(targetBlock, block);
          }
        }
        this.emitState(); break;
      }
      case 'globalState': {
        // Just propagate - state is initialized in constructor
        this.emitState(); await this.executeConnections(block); break;
      }
      // ---- Auth blocks ----
      case 'authLogin': {
        const emailId = block.props.emailVar || '';
        const passId = block.props.passwordVar || '';
        const email = this.state.inputValues[emailId] || this.resolveStr(emailId);
        const password = this.state.inputValues[passId] || this.resolveStr(passId);
        try {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) {
            this.state.variables[block.props.errorVar || '_authError'] = error.message;
            this.state.variables[block.props.resultVar || '_authUser'] = '';
            this.state.executionLog.push(`🔑 Login failed: ${error.message}`);
          } else {
            const { data: { user } } = await supabase.auth.getUser();
            this.state.variables[block.props.resultVar || '_authUser'] = user?.email || 'logged_in';
            this.state.variables[block.props.errorVar || '_authError'] = '';
            this.state.variables['_isLoggedIn'] = 'true';
            this.state.executionLog.push(`🔑 Login success: ${user?.email}`);
          }
        } catch { this.state.executionLog.push('🔑 Login error'); }
        this.emitState(); await this.executeConnections(block); break;
      }
      case 'authRegister': {
        const emailId = block.props.emailVar || '';
        const passId = block.props.passwordVar || '';
        const email = this.state.inputValues[emailId] || this.resolveStr(emailId);
        const password = this.state.inputValues[passId] || this.resolveStr(passId);
        try {
          const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
          if (error) {
            this.state.variables[block.props.errorVar || '_authError'] = error.message;
            this.state.executionLog.push(`📝 Register failed: ${error.message}`);
          } else {
            this.state.variables[block.props.resultVar || '_authUser'] = email;
            this.state.variables[block.props.errorVar || '_authError'] = '';
            this.state.executionLog.push(`📝 Register success — check email to confirm`);
          }
        } catch { this.state.executionLog.push('📝 Register error'); }
        this.emitState(); await this.executeConnections(block); break;
      }
      case 'authLogout': {
        try {
          await supabase.auth.signOut();
          this.state.variables['_isLoggedIn'] = 'false';
          this.state.variables['_authUser'] = '';
          this.state.executionLog.push('🚪 Logged out');
        } catch { this.state.executionLog.push('🚪 Logout error'); }
        this.emitState(); await this.executeConnections(block); break;
      }
      case 'authForgotPassword': {
        const emailId = block.props.emailVar || '';
        const email = this.state.inputValues[emailId] || this.resolveStr(emailId);
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
          if (error) {
            this.state.variables[block.props.errorVar || '_authError'] = error.message;
            this.state.executionLog.push(`🔒 Reset failed: ${error.message}`);
          } else {
            this.state.variables[block.props.resultVar || '_authResult'] = 'sent';
            this.state.variables[block.props.errorVar || '_authError'] = '';
            this.state.executionLog.push('🔒 Password reset email sent');
          }
        } catch { this.state.executionLog.push('🔒 Reset error'); }
        this.emitState(); await this.executeConnections(block); break;
      }
      case 'authGuard': {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          this.state.variables[block.props.userVar || '_authUser'] = session.user.email || 'logged_in';
          this.state.variables['_isLoggedIn'] = 'true';
          this.state.executionLog.push('🛡️ Auth guard: user authenticated');
          await this.executeConnections(block);
        } else {
          this.state.variables['_isLoggedIn'] = 'false';
          this.state.executionLog.push('🛡️ Auth guard: not authenticated — skipped');
        }
        this.emitState(); break;
      }
      case 'authSocialLogin': {
        try {
          const { error } = await supabase.auth.signInWithOAuth({ provider: (block.props.provider || 'google') as any, options: { redirectTo: window.location.origin } });
          if (error) {
            this.state.variables[block.props.errorVar || '_authError'] = error.message;
            this.state.executionLog.push(`🌐 Social login failed: ${error.message}`);
          } else {
            this.state.executionLog.push('🌐 Social login redirect initiated');
          }
        } catch { this.state.executionLog.push('🌐 Social login error'); }
        this.emitState(); await this.executeConnections(block); break;
      }
      default:
        await this.executeConnections(block); break;
    }
  }

  handleGoBack() {
    if (this.state.screenStack.length > 1) {
      this.state.screenStack.pop();
      this.state.currentScreen = this.state.screenStack[this.state.screenStack.length - 1];
      this.state.executionLog.push(`⬅️ Back → ${this.state.currentScreen}`);
      this.emitState();
    }
  }

  getState(): ExecutionState { return { ...this.state }; }

  stop() {
    this.state.stopped = true;
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.realtimeChannels.forEach(ch => supabase.removeChannel(ch));
    this.realtimeChannels = [];
    if (!this.options.isolated) appEventBus.clear();
  }

  setSlowMode(enabled: boolean) { this.slowMode = enabled; }
}
