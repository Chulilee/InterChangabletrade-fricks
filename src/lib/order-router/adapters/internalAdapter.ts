/**
 * Compatibility re-export for the internal matching-engine adapter.
 *
 * The canonical implementation lives in `internalMatchingEngineAdapter.ts`.
 * This path is kept so issue references to `adapters/internalAdapter.ts`
 * resolve to the decoupled, interface-driven adapter.
 */
export { InternalMatchingEngineAdapter } from './internalMatchingEngineAdapter';
export type { MatchingEngine } from '../types';
