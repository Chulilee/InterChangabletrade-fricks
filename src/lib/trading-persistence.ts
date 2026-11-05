import fs from 'node:fs';
import path from 'node:path';
import type { Fill, Order } from '@/types/trading';

/**
 * Persistence backends for the trading engine.
 *
 * The engine used to keep every order, fill and trade in memory only, so a
 * restart wiped the order book and the trade history. This module defines a
 * small synchronous persistence contract plus three backends:
 *
 *  - `FileTradingPersistence` — JSON snapshot written atomically to disk.
 *    Survives restarts; suitable for a single-node deployment.
 *  - `InMemoryTradingPersistence` — keeps the latest snapshot in memory.
 *    Useful for tests and for the `memory` configuration.
 *  - disabled — pass `null` as the engine's persistence and nothing is saved.
 *
 * The contract is synchronous on `load()` because the engine restores state
 * from its constructor; `save()` may return a promise for backends that flush
 * asynchronously (it is not awaited — durability is the caller's concern).
 */

export const TRADING_ENGINE_SNAPSHOT_VERSION = 1;

export interface TradingEngineSnapshot {
  version: number;
  /** Epoch milliseconds when the snapshot was taken. */
  savedAt: number;
  /** Every order the engine knows about, in insertion order. */
  orders: Order[];
  /** Fills keyed by order id. */
  fills: Record<string, Fill[]>;
  /** Historical trades keyed by trading pair. */
  trades: Record<string, Fill[]>;
}

export interface TradingPersistence {
  /** Return the last stored snapshot, or null when none exists. */
  load(): TradingEngineSnapshot | null;
  /** Persist a snapshot. */
  save(snapshot: TradingEngineSnapshot): void | Promise<void>;
  /** Drop all persisted state, when the backend supports it. */
  clear?(): void;
}

function isSnapshot(value: unknown): value is TradingEngineSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<TradingEngineSnapshot>;
  return (
    candidate.version === TRADING_ENGINE_SNAPSHOT_VERSION &&
    Array.isArray(candidate.orders) &&
    !!candidate.fills &&
    typeof candidate.fills === 'object' &&
    !!candidate.trades &&
    typeof candidate.trades === 'object'
  );
}

/** Deep-clone via JSON: snapshots only ever contain plain JSON data. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class InMemoryTradingPersistence implements TradingPersistence {
  private snapshot: TradingEngineSnapshot | null = null;

  load(): TradingEngineSnapshot | null {
    return this.snapshot ? clone(this.snapshot) : null;
  }

  save(snapshot: TradingEngineSnapshot): void {
    this.snapshot = clone(snapshot);
  }

  clear(): void {
    this.snapshot = null;
  }
}

export class FileTradingPersistence implements TradingPersistence {
  constructor(private readonly filePath: string) {}

  load(): TradingEngineSnapshot | null {
    let raw: string;
    try {
      raw = fs.readFileSync(this.filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      // An unreadable state file must not take the engine down; start empty.
      console.error(`[trading-persistence] failed to read ${this.filePath}:`, error);
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isSnapshot(parsed)) {
        console.error(`[trading-persistence] ${this.filePath} holds an unrecognized snapshot; ignoring`);
        return null;
      }
      return parsed;
    } catch (error) {
      console.error(`[trading-persistence] ${this.filePath} is not valid JSON; starting empty:`, error);
      return null;
    }
  }

  save(snapshot: TradingEngineSnapshot): void {
    const directory = path.dirname(this.filePath);
    fs.mkdirSync(directory, { recursive: true });
    // Write to a temp file then rename so a crash mid-write never leaves a
    // truncated snapshot behind.
    const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(snapshot));
    fs.renameSync(tempPath, this.filePath);
  }

  clear(): void {
    try {
      fs.unlinkSync(this.filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}

export type TradingPersistenceBackendKind = 'file' | 'memory' | 'none';

const DEFAULT_STATE_FILE = '.trading-engine-state.json';

/**
 * Build a persistence backend from the environment:
 *   TRADING_PERSISTENCE = 'file' | 'memory' | 'none'
 *   TRADING_STATE_PATH  = path of the snapshot file (default: ./.trading-engine-state.json)
 *
 * Defaults to `file` so the running app survives restarts out of the box;
 * under NODE_ENV=test it defaults to `none` so unit tests stay hermetic.
 */
export function createTradingPersistenceFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): TradingPersistence | null {
  const explicit = env.TRADING_PERSISTENCE?.trim().toLowerCase();
  const kind = explicit ?? (env.NODE_ENV === 'test' ? 'none' : 'file');

  switch (kind) {
    case 'none':
    case 'off':
    case 'disabled':
      return null;
    case 'memory':
    case 'in-memory':
      return new InMemoryTradingPersistence();
    case 'file': {
      const filePath = env.TRADING_STATE_PATH?.trim() || path.join(process.cwd(), DEFAULT_STATE_FILE);
      return new FileTradingPersistence(filePath);
    }
    default:
      console.warn(
        `[trading-persistence] unknown TRADING_PERSISTENCE "${kind}"; expected file|memory|none. Falling back to file.`,
      );
      return new FileTradingPersistence(env.TRADING_STATE_PATH?.trim() || path.join(process.cwd(), DEFAULT_STATE_FILE));
  }
}
