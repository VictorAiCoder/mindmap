// embed/lib/readApiRef.ts
import { isRef, unref } from 'vue'

/**
 * Tolerant read of a ref-like field on a `MindMapApi` value.
 *
 * Consumers hand the API to us in three shapes, and a single read must survive all:
 *
 *  1. raw API — real Vue refs (`.rootNode` is a ref, `.value` required).
 *     Used by the standalone app (src/App.vue).
 *  2. reactive proxy — a deep `ref()` in the consumer auto-unwrapped every nested
 *     ref, so `.rootNode` is already a plain value and `.value` is `undefined`.
 *     Used by enc (`MindmapEditor.vue`).
 *  3. structural carrier — a plain `{ value }` object that is not a Vue ref.
 *     Used by embed callers that build a minimal API by hand (enc ArticleCard).
 *
 * `unref` resolves shapes 1 and 2; the structural fallback resolves shape 3.
 * Passing an unknown/undefined field returns `undefined` instead of throwing.
 */
export function readApiRef<T>(field: unknown): T | undefined {
  if (isRef(field)) return unref(field) as T
  if (isStructuralRef(field)) return field.value as T
  return field as T | undefined
}

/**
 * A carrier is structural only when `value` is its single own key. A real node
 * or array has other keys, so it is never mistaken for a ref carrier.
 */
function isStructuralRef(value: unknown): value is { value: unknown } {
  if (typeof value !== 'object' || value === null) return false
  const keys = Object.keys(value)
  return keys.length === 1 && keys[0] === 'value'
}