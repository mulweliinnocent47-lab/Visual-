// Pure helpers for the ai-block-generator edge function.
// No Deno or Node APIs are used here, so the same file runs in the edge runtime
// and in the Vitest suite (src/test/aiValidate.test.ts).

/** Block types the AI is allowed to return. Mirrors the list in the system prompt. */
export const ALLOWED_BLOCK_TYPES: readonly string[] = [
  // UI
  "button", "text", "input", "display", "image",
  // Logic
  "condition", "ifElse", "onStart", "timer", "wait", "alert",
  // Data
  "variable", "listCreate", "listAdd", "listRemove", "math",
  // Loops
  "repeat", "forLoop", "whileLoop",
  // Screens
  "screen", "navigateTo", "goBack",
  // Layout
  "row", "column",
  // Backend
  "apiRequest", "localStorage",
  // Auth
  "authLogin", "authRegister", "authLogout", "authForgotPassword", "authGuard", "authSocialLogin",
  // Database
  "dbCreate", "dbRead", "dbUpdate", "dbDelete", "dbQuery",
  // Functions and state
  "functionDef", "functionCall", "globalState", "reactiveVar",
];

export const LIMITS = {
  minPromptChars: 3,
  maxPromptChars: 1000,
  maxRequestBytes: 8 * 1024,
  /** Edit and explain requests carry the current project, so they may be larger. */
  maxContextRequestBytes: 160 * 1024,
  maxBlocks: 150,
  maxContextBlocks: 150,
  maxContextStringChars: 300,
  maxContextChars: 60_000,
  maxEditAdds: 60,
  maxEditUpdates: 80,
  maxEditRemoves: 60,
  maxTotalBlocks: 200,
  maxSummaryChars: 300,
  maxExplanationChars: 4000,
  maxStringChars: 2000,
  maxLabelChars: 60,
  maxNameChars: 80,
  maxScreens: 20,
  maxScreenNameChars: 50,
  maxConnections: 30,
  maxPropKeys: 40,
  maxArrayItems: 100,
  maxDepth: 4,
  maxCoordinate: 5000,
} as const;

const ID_PATTERN = /^[A-Za-z0-9_.:-]{1,64}$/;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

type JsonValue = null | string | number | boolean | JsonValue[] | { [key: string]: JsonValue };

export interface SanitizedBlock {
  id: string;
  type: string;
  label: string;
  props: Record<string, JsonValue>;
  x: number;
  y: number;
  connections: string[];
  screenId?: string;
}

export interface SanitizedProject {
  name: string;
  blocks: SanitizedBlock[];
  screens?: string[];
  activeScreen?: string;
  /** How many blocks were removed because they were invalid or unsupported. */
  dropped: number;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validates the request body and returns a cleaned prompt. */
export function parsePrompt(body: unknown): Result<string> {
  if (!isPlainObject(body) || typeof body.prompt !== "string") {
    return { ok: false, error: "Describe the app you want to build." };
  }
  // Strip control characters but keep tabs and newlines.
  // deno-lint-ignore no-control-regex
  const prompt = body.prompt.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (prompt.length < LIMITS.minPromptChars) {
    return { ok: false, error: "Describe the app you want to build." };
  }
  if (prompt.length > LIMITS.maxPromptChars) {
    return { ok: false, error: `Keep your description under ${LIMITS.maxPromptChars} characters.` };
  }
  return { ok: true, value: prompt };
}

/** Pulls a JSON value out of a model reply that may be wrapped in a Markdown code fence. */
export function extractJson(content: string): unknown {
  let text = content;
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) text = fenced[1];
  return JSON.parse(text.trim());
}

function sanitizeValue(value: unknown, depth: number, maxString: number = LIMITS.maxStringChars): JsonValue | undefined {
  if (value === null) return null;
  switch (typeof value) {
    case "string":
      return value.slice(0, maxString);
    case "number":
      return Number.isFinite(value) ? value : undefined;
    case "boolean":
      return value;
    case "object": {
      if (depth >= LIMITS.maxDepth) return undefined;
      if (Array.isArray(value)) {
        const items: JsonValue[] = [];
        for (const item of value.slice(0, LIMITS.maxArrayItems)) {
          const clean = sanitizeValue(item, depth + 1, maxString);
          if (clean !== undefined) items.push(clean);
        }
        return items;
      }
      const out: { [key: string]: JsonValue } = {};
      let keys = 0;
      for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
        if (FORBIDDEN_KEYS.has(key) || key.length > 64) continue;
        if (++keys > LIMITS.maxPropKeys) break;
        const clean = sanitizeValue(inner, depth + 1, maxString);
        if (clean !== undefined) out[key] = clean;
      }
      return out;
    }
    default:
      return undefined;
  }
}

function clampCoordinate(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.round(Math.max(-LIMITS.maxCoordinate, Math.min(LIMITS.maxCoordinate, value)));
}

function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim().slice(0, max);
  return text.length > 0 ? text : undefined;
}

function cleanScreens(rawScreens: unknown, rawActive: unknown): { screens?: string[]; activeScreen?: string } {
  if (!Array.isArray(rawScreens)) return {};
  const unique = new Set<string>();
  for (const item of rawScreens) {
    const name = cleanText(item, LIMITS.maxScreenNameChars);
    if (name) unique.add(name);
    if (unique.size >= LIMITS.maxScreens) break;
  }
  if (unique.size === 0) return {};
  const screens = [...unique];
  const requested = cleanText(rawActive, LIMITS.maxScreenNameChars);
  return { screens, activeScreen: requested && screens.includes(requested) ? requested : screens[0] };
}

interface CleanBlocksOptions {
  allowedTypes: ReadonlySet<string>;
  screens?: string[];
  /** Ids that already exist and may not be reused (edit mode). */
  reservedIds?: ReadonlySet<string>;
  /** Existing ids that new blocks may connect to (edit mode). */
  linkableIds?: ReadonlySet<string>;
}

/** Keeps valid, unique blocks and makes their connections point at blocks that exist. */
function cleanBlocks(rawBlocks: unknown[], opts: CleanBlocksOptions): { blocks: SanitizedBlock[]; dropped: number } {
  const { allowedTypes, screens, reservedIds, linkableIds } = opts;
  const seen = new Set<string>();
  const blocks: SanitizedBlock[] = [];
  let dropped = 0;

  rawBlocks.forEach((entry, index) => {
    if (!isPlainObject(entry)) { dropped++; return; }
    const id = typeof entry.id === "string" ? entry.id : "";
    const type = typeof entry.type === "string" ? entry.type : "";
    if (!ID_PATTERN.test(id) || seen.has(id) || reservedIds?.has(id) || !allowedTypes.has(type)) { dropped++; return; }
    seen.add(id);

    const props = sanitizeValue(entry.props, 0);
    const screenId = cleanText(entry.screenId, LIMITS.maxScreenNameChars);

    blocks.push({
      id,
      type,
      label: cleanText(entry.label, LIMITS.maxLabelChars) ?? type,
      props: isPlainObject(props) ? (props as Record<string, JsonValue>) : {},
      x: clampCoordinate(entry.x, 20),
      y: clampCoordinate(entry.y, 20 + index * 80),
      connections: Array.isArray(entry.connections)
        ? entry.connections.filter((c): c is string => typeof c === "string").slice(0, LIMITS.maxConnections)
        : [],
      ...(screenId ? { screenId: screens && !screens.includes(screenId) ? screens[0] : screenId } : {}),
    });
  });

  const targets = new Set<string>([...seen, ...(linkableIds ?? [])]);
  for (const block of blocks) block.connections = cleanConnections(block.connections, block.type, block.id, targets);
  return { blocks, dropped };
}

/**
 * Connections may only point at blocks that exist. For If/Else the position matters
 * (0 = true branch, 1 = false branch), so a bad link leaves its slot empty instead of shifting.
 */
function cleanConnections(connections: readonly string[], type: string, selfId: string, targets: ReadonlySet<string>): string[] {
  const valid = (c: string) => targets.has(c) && c !== selfId;
  if (type === "ifElse") {
    const slots = connections.slice(0, 2).map((c) => (valid(c) ? c : ""));
    while (slots.length > 0 && slots[slots.length - 1] === "") slots.pop();
    return slots;
  }
  return connections.filter(valid);
}

/**
 * Checks the model's JSON against what the app can import. Unknown block types,
 * bad ids and broken connections are removed instead of failing the whole request.
 */
export function sanitizeProject(raw: unknown): Result<SanitizedProject> {
  if (!isPlainObject(raw) || !Array.isArray(raw.blocks)) {
    return { ok: false, error: "The AI reply was not a valid app." };
  }

  const rawBlocks = raw.blocks.slice(0, LIMITS.maxBlocks);
  const { screens, activeScreen } = cleanScreens(raw.screens, raw.activeScreen);
  const cleaned = cleanBlocks(rawBlocks, { allowedTypes: new Set(ALLOWED_BLOCK_TYPES), screens });
  const dropped = cleaned.dropped + Math.max(0, raw.blocks.length - rawBlocks.length);

  if (cleaned.blocks.length === 0) {
    return { ok: false, error: "The AI did not return any usable blocks." };
  }

  return {
    ok: true,
    value: {
      name: cleanText(raw.name, LIMITS.maxNameChars) ?? "AI Generated App",
      blocks: cleaned.blocks,
      ...(screens ? { screens, activeScreen } : {}),
      dropped,
    },
  };
}

// ---------------------------------------------------------------------------
// Edit and explain modes
// ---------------------------------------------------------------------------

export type AiMode = "generate" | "edit" | "explain";

/** A block of the current project, sent so the AI can read or change it. */
export interface ContextBlock {
  id: string;
  type: string;
  label: string;
  props: Record<string, JsonValue>;
  x: number;
  y: number;
  connections: string[];
  screenId?: string;
}

export interface ContextProject {
  name: string;
  blocks: ContextBlock[];
  screens?: string[];
  activeScreen?: string;
}

export interface AiRequest {
  mode: AiMode;
  prompt: string;
  project?: ContextProject;
}

const TYPE_PATTERN = /^[A-Za-z][A-Za-z0-9]{0,39}$/;
export const DEFAULT_EXPLAIN_PROMPT = "Explain what this project does in simple terms.";

/** Cleans the current project the browser sent. Any block type is allowed here: it is only read. */
export function sanitizeContext(raw: unknown): Result<ContextProject> {
  if (!isPlainObject(raw) || !Array.isArray(raw.blocks) || raw.blocks.length === 0) {
    return { ok: false, error: "Add some blocks first, or use Build to start a new app." };
  }
  if (raw.blocks.length > LIMITS.maxContextBlocks) {
    return { ok: false, error: `This project has more than ${LIMITS.maxContextBlocks} blocks, which is too large for the AI to read.` };
  }

  const seen = new Set<string>();
  const blocks: ContextBlock[] = [];
  for (const entry of raw.blocks) {
    if (!isPlainObject(entry)) continue;
    const id = typeof entry.id === "string" ? entry.id : "";
    const type = typeof entry.type === "string" ? entry.type : "";
    if (!ID_PATTERN.test(id) || seen.has(id) || !TYPE_PATTERN.test(type)) continue;
    seen.add(id);
    const props = sanitizeValue(entry.props, 0, LIMITS.maxContextStringChars);
    const screenId = cleanText(entry.screenId, LIMITS.maxScreenNameChars);
    blocks.push({
      id,
      type,
      label: cleanText(entry.label, LIMITS.maxLabelChars) ?? type,
      props: isPlainObject(props) ? (props as Record<string, JsonValue>) : {},
      x: clampCoordinate(entry.x, 0),
      y: clampCoordinate(entry.y, 0),
      connections: Array.isArray(entry.connections)
        ? entry.connections.filter((c): c is string => typeof c === "string").slice(0, LIMITS.maxConnections)
        : [],
      ...(screenId ? { screenId } : {}),
    });
  }
  if (blocks.length === 0) return { ok: false, error: "Add some blocks first, or use Build to start a new app." };

  const { screens, activeScreen } = cleanScreens(raw.screens, raw.activeScreen);
  const project: ContextProject = {
    name: cleanText(raw.name, LIMITS.maxNameChars) ?? "My project",
    blocks,
    ...(screens ? { screens, activeScreen } : {}),
  };
  if (JSON.stringify(project).length > LIMITS.maxContextChars) {
    return { ok: false, error: "This project is too large for the AI to read. Try a smaller one." };
  }
  return { ok: true, value: project };
}

/** Reads the whole request body: which mode, what was asked, and the current project when needed. */
export function parseRequest(body: unknown): Result<AiRequest> {
  if (!isPlainObject(body)) return { ok: false, error: "Describe the app you want to build." };
  const mode = body.mode === undefined ? "generate" : body.mode;
  if (mode !== "generate" && mode !== "edit" && mode !== "explain") {
    return { ok: false, error: "Unknown AI mode." };
  }

  if (mode === "explain" && (body.prompt === undefined || body.prompt === "")) {
    const project = sanitizeContext(body.project);
    return project.ok ? { ok: true, value: { mode, prompt: DEFAULT_EXPLAIN_PROMPT, project: project.value } } : project;
  }

  const prompt = parsePrompt(body);
  if (!prompt.ok) {
    return { ok: false, error: mode === "edit" ? "Describe the change you want." : prompt.error };
  }
  if (mode === "generate") return { ok: true, value: { mode, prompt: prompt.value } };

  const project = sanitizeContext(body.project);
  if (!project.ok) return project;
  return { ok: true, value: { mode, prompt: prompt.value, project: project.value } };
}

export interface BlockUpdate {
  id: string;
  label?: string;
  /** Merged into the block's existing props. */
  props?: Record<string, JsonValue>;
  x?: number;
  y?: number;
  /** Replaces the block's connections. */
  connections?: string[];
}

export interface SanitizedEdit {
  summary: string;
  add: SanitizedBlock[];
  update: BlockUpdate[];
  remove: string[];
  /** Suggestions that were ignored because they were invalid or not allowed. */
  dropped: number;
}

/**
 * Checks the AI's suggested changes against the project it was shown. The AI can only
 * add blocks of allowed types and change or remove existing blocks of allowed types.
 * It can never change a block's type or touch Custom Code.
 */
export function sanitizeEdit(raw: unknown, context: ContextProject): Result<SanitizedEdit> {
  if (!isPlainObject(raw)) return { ok: false, error: "The AI reply was not a valid set of changes." };
  const changes = isPlainObject(raw.changes) ? raw.changes : raw;
  const allowed = new Set(ALLOWED_BLOCK_TYPES);

  const existingTypes = new Map(context.blocks.map((b) => [b.id, b.type]));
  const existingIds = new Set(existingTypes.keys());
  const editable = (id: string) => existingTypes.has(id) && allowed.has(existingTypes.get(id) as string);

  let dropped = 0;
  const asList = (value: unknown, max: number): unknown[] => {
    if (!Array.isArray(value)) return [];
    dropped += Math.max(0, value.length - max);
    return value.slice(0, max);
  };

  // Removals
  const remove: string[] = [];
  for (const id of asList(changes.remove, LIMITS.maxEditRemoves)) {
    if (typeof id === "string" && editable(id) && !remove.includes(id)) remove.push(id);
    else dropped++;
  }
  const removed = new Set(remove);

  // Additions
  const added = cleanBlocks(asList(changes.add, LIMITS.maxEditAdds), {
    allowedTypes: allowed,
    screens: context.screens,
    reservedIds: existingIds,
    linkableIds: existingIds,
  });
  dropped += added.dropped;
  const addedIds = new Set(added.blocks.map((b) => b.id));
  const survivors = new Set<string>([...existingIds, ...addedIds].filter((id) => !removed.has(id)));
  for (const block of added.blocks) {
    block.connections = cleanConnections(block.connections, block.type, block.id, survivors);
  }

  // Updates
  const update: BlockUpdate[] = [];
  const updatedIds = new Set<string>();
  for (const entry of asList(changes.update, LIMITS.maxEditUpdates)) {
    if (!isPlainObject(entry) || typeof entry.id !== "string") { dropped++; continue; }
    const id = entry.id;
    if (!editable(id) || removed.has(id) || updatedIds.has(id)) { dropped++; continue; }

    const op: BlockUpdate = { id };
    const label = cleanText(entry.label, LIMITS.maxLabelChars);
    if (label) op.label = label;
    if (isPlainObject(entry.props)) {
      const props = sanitizeValue(entry.props, 0);
      if (isPlainObject(props) && Object.keys(props).length > 0) op.props = props as Record<string, JsonValue>;
    }
    if (typeof entry.x === "number" && Number.isFinite(entry.x)) op.x = clampCoordinate(entry.x, 0);
    if (typeof entry.y === "number" && Number.isFinite(entry.y)) op.y = clampCoordinate(entry.y, 0);
    if (Array.isArray(entry.connections)) {
      const list = entry.connections.filter((c): c is string => typeof c === "string").slice(0, LIMITS.maxConnections);
      op.connections = cleanConnections(list, existingTypes.get(id) as string, id, survivors);
    }
    if (Object.keys(op).length === 1) { dropped++; continue; }
    updatedIds.add(id);
    update.push(op);
  }

  if (added.blocks.length + update.length + remove.length === 0) {
    return { ok: false, error: "The AI did not suggest any changes. Try describing the change differently." };
  }
  if (context.blocks.length - remove.length + added.blocks.length > LIMITS.maxTotalBlocks) {
    return { ok: false, error: `That change would make the project larger than ${LIMITS.maxTotalBlocks} blocks.` };
  }

  return {
    ok: true,
    value: {
      summary: cleanText(raw.summary, LIMITS.maxSummaryChars) ?? "Suggested changes",
      add: added.blocks,
      update,
      remove,
      dropped,
    },
  };
}

/** Cleans a plain-text explanation from the model. */
export function sanitizeExplanation(content: unknown): Result<string> {
  if (typeof content !== "string") return { ok: false, error: "The AI reply could not be read." };
  // deno-lint-ignore no-control-regex
  let text = content.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  const fenced = text.match(/^```[a-z]*\s*([\s\S]*?)```$/i);
  if (fenced) text = fenced[1].trim();
  if (text.length === 0) return { ok: false, error: "The AI did not explain anything. Try again." };
  if (text.length > LIMITS.maxExplanationChars) text = `${text.slice(0, LIMITS.maxExplanationChars - 1).trimEnd()}…`;
  return { ok: true, value: text };
}

/** Returns the origin to echo in Access-Control-Allow-Origin, or null if it is not allowed. */
export function pickAllowedOrigin(origin: string | null, allowedOrigins: readonly string[]): string | null {
  if (!origin) return null;
  return allowedOrigins.includes(origin) ? origin : null;
}
