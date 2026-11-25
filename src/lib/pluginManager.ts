/**
 * Plugin System Foundation (V4)
 * Allows dynamic registration of blocks, categories, and events.
 */

import { BlockType, BlockDefinition, BlockCategory } from '@/types/blocks';

export interface PluginBlockDef {
  type: string;
  definition: BlockDefinition;
  color: string;
  defaultProps: Record<string, any>;
  defaultLabel: string;
}

export interface PluginCategoryDef {
  key: string;
  label: string;
  icon: string;
}

export interface PluginEventDef {
  name: string;
  description: string;
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  blocks?: PluginBlockDef[];
  categories?: PluginCategoryDef[];
  events?: PluginEventDef[];
  onActivate?: () => void;
  onDeactivate?: () => void;
}

type PluginChangeHandler = () => void;

class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private listeners: Set<PluginChangeHandler> = new Set();

  register(plugin: Plugin): boolean {
    if (this.plugins.has(plugin.id)) return false;
    this.plugins.set(plugin.id, plugin);
    plugin.onActivate?.();
    this.notify();
    return true;
  }

  unregister(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;
    plugin.onDeactivate?.();
    this.plugins.delete(pluginId);
    this.notify();
    return true;
  }

  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getExtraBlocks(): PluginBlockDef[] {
    return this.getAll().flatMap(p => p.blocks || []);
  }

  getExtraCategories(): PluginCategoryDef[] {
    return this.getAll().flatMap(p => p.categories || []);
  }

  onChange(handler: PluginChangeHandler) {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }
}

export const pluginManager = new PluginManager();
