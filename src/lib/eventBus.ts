type EventHandler = (...args: any[]) => void;

class EventBus {
  private listeners: Map<string, Set<EventHandler>> = new Map();

  on(event: string, handler: EventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler) {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: string, ...args: any[]) {
    this.listeners.get(event)?.forEach(handler => {
      try { handler(...args); } catch (e) { console.error(`Event error [${event}]:`, e); }
    });
  }

  clear() {
    this.listeners.clear();
  }

  removeAllForEvent(event: string) {
    this.listeners.delete(event);
  }
}

export const appEventBus = new EventBus();

// Standard events
export const EVENTS = {
  BUTTON_CLICK: 'button:click',
  INPUT_CHANGE: 'input:change',
  APP_START: 'app:start',
  VARIABLE_SET: 'variable:set',
  DISPLAY_UPDATE: 'display:update',
  CONDITION_RESULT: 'condition:result',
  MATH_RESULT: 'math:result',
  TIMER_TICK: 'timer:tick',
  ALERT_SHOW: 'alert:show',
} as const;

export type AppEvent = typeof EVENTS[keyof typeof EVENTS];
