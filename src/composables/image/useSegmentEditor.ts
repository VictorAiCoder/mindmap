// src/composables/image/useSegmentEditor.ts
import { ref, computed, type Ref } from 'vue'
import type { ImageSegment } from '@/types/mindmap'
import type { MindMapApi } from '@/types/mindmap-api'

// ─── Public types ─────────────────────────────────

export type Rect = { x: number; y: number; w: number; h: number }
export type Corner = 'tl' | 'tr' | 'bl' | 'br'

// ─── FSM ──────────────────────────────────────────

type Interaction =
  | { kind: 'idle' }
  | {
      kind: 'creating'
      startNx: number
      startNy: number
      curNx: number
      curNy: number
    }
  | {
      kind: 'moving'
      id: string
      startClip: Rect
      lastClip: Rect
      pointerStartNx: number
      pointerStartNy: number
    }
  | {
      kind: 'resizing'
      id: string
      corner: Corner
      startClip: Rect
      lastClip: Rect
      pointerStartNx: number
      pointerStartNy: number
    }

const MIN_SIZE = 0.01

// ─── Pure helpers ─────────────────────────────────

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function sanitizeRect(r: Rect): Rect {
  const x = clamp01(r.x)
  const y = clamp01(r.y)
  const w = Math.max(MIN_SIZE, Math.min(1 - x, r.w))
  const h = Math.max(MIN_SIZE, Math.min(1 - y, r.h))
  return { x, y, w, h }
}

function sameRect(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
}

// ─── Options ──────────────────────────────────────

export interface SegmentEditorOptions {
  mindmap: MindMapApi
  /** Текущий sourceId (raw-картинка). Реактивный. */
  sourceId: Ref<string | null>
}

// ─── Composable ───────────────────────────────────

/**
 * FSM редактора сегментов. Работает в normalized координатах [0..1]
 * относительно исходной (raw) картинки.
 *
 * Паттерн истории:
 *  - create:  на pointerUp → mindmap.addSegment() (1 snapshot)
 *  - move:    серия updateSegmentLive() (без истории),
 *             на pointerUp → откат + commitSegment() (1 snapshot)
 *  - resize:  аналогично move
 *  - delete:  mindmap.deleteSegment() (1 snapshot)
 *  - rename:  mindmap.renameSegment() (1 snapshot, только если изменилось)
 */
export function useSegmentEditor(opts: SegmentEditorOptions) {
  const { mindmap, sourceId } = opts
  const storage = mindmap.imageStorage

  // ─── State ──────────────────────────────────────

  const selectedId = ref<string | null>(null)
  const interaction = ref<Interaction>({ kind: 'idle' })

  // ─── Derived ────────────────────────────────────

  const segments = computed<readonly ImageSegment[]>(() => {
    const sid = sourceId.value
    if (!sid) return []
    return storage.listSegmentsOf(sid)
  })

  const selectedSegment = computed<ImageSegment | null>(() => {
    const id = selectedId.value
    if (!id) return null
    return segments.value.find((s) => s.id === id) ?? null
  })

  /** Прямоугольник создаваемого сегмента (для preview-рендера). */
  const draftRect = computed<Rect | null>(() => {
    const st = interaction.value
    if (st.kind !== 'creating') return null
    const x = Math.min(st.startNx, st.curNx)
    const y = Math.min(st.startNy, st.curNy)
    const w = Math.abs(st.curNx - st.startNx)
    const h = Math.abs(st.curNy - st.startNy)
    return { x, y, w, h }
  })

  // ─── Commands (для UI вне канвы) ────────────────

  function select(id: string | null): void {
    selectedId.value = id
  }

  function deleteSelected(): void {
    const id = selectedId.value
    if (!id) return
    mindmap.deleteSegment(id)
    selectedId.value = null
  }

  function renameSelected(name: string): void {
    const id = selectedId.value
    if (!id) return
    mindmap.renameSegment(id, name)
  }

  // ─── Pointer FSM transitions ────────────────────

  function beginCreate(nx: number, ny: number): void {
    // Если уже идёт другое взаимодействие — игнорируем (защита от багов)
    if (interaction.value.kind !== 'idle') return

    const x = clamp01(nx)
    const y = clamp01(ny)
    selectedId.value = null
    interaction.value = {
      kind: 'creating',
      startNx: x,
      startNy: y,
      curNx: x,
      curNy: y,
    }
  }

  function beginMove(id: string, nx: number, ny: number): void {
    if (interaction.value.kind !== 'idle') return

    const seg = segments.value.find((s) => s.id === id)
    if (!seg) return

    selectedId.value = id
    interaction.value = {
      kind: 'moving',
      id,
      startClip: { ...seg.clip },
      lastClip: { ...seg.clip },
      pointerStartNx: nx,
      pointerStartNy: ny,
    }
  }

  function beginResize(id: string, corner: Corner, nx: number, ny: number): void {
    if (interaction.value.kind !== 'idle') return

    const seg = segments.value.find((s) => s.id === id)
    if (!seg) return

    selectedId.value = id
    interaction.value = {
      kind: 'resizing',
      id,
      corner,
      startClip: { ...seg.clip },
      lastClip: { ...seg.clip },
      pointerStartNx: nx,
      pointerStartNy: ny,
    }
  }

  function onPointerMove(nx: number, ny: number): void {
    const st = interaction.value
    if (st.kind === 'idle') return

    if (st.kind === 'creating') {
      // Заменяем state целиком, чтобы реактивность точно сработала
      interaction.value = {
        ...st,
        curNx: clamp01(nx),
        curNy: clamp01(ny),
      }
      return
    }

    if (st.kind === 'moving') {
      const dx = nx - st.pointerStartNx
      const dy = ny - st.pointerStartNy

      const newClip = sanitizeRect({
        x: st.startClip.x + dx,
        y: st.startClip.y + dy,
        w: st.startClip.w,
        h: st.startClip.h,
      })

      if (sameRect(newClip, st.lastClip)) return

      st.lastClip = newClip
      mindmap.updateSegmentLive(st.id, { clip: newClip })
      return
    }

    if (st.kind === 'resizing') {
      const dx = nx - st.pointerStartNx
      const dy = ny - st.pointerStartNy

      let { x, y, w, h } = st.startClip

      if (st.corner === 'tl') {
        x += dx
        y += dy
        w -= dx
        h -= dy
      } else if (st.corner === 'tr') {
        y += dy
        w += dx
        h -= dy
      } else if (st.corner === 'bl') {
        x += dx
        w -= dx
        h += dy
      } else {
        // 'br'
        w += dx
        h += dy
      }

      // Защита от выворачивания: фиксируем "якорный" угол
      if (w < MIN_SIZE) {
        if (st.corner === 'tl' || st.corner === 'bl') {
          x = st.startClip.x + st.startClip.w - MIN_SIZE
        }
        w = MIN_SIZE
      }
      if (h < MIN_SIZE) {
        if (st.corner === 'tl' || st.corner === 'tr') {
          y = st.startClip.y + st.startClip.h - MIN_SIZE
        }
        h = MIN_SIZE
      }

      const newClip = sanitizeRect({ x, y, w, h })
      if (sameRect(newClip, st.lastClip)) return

      st.lastClip = newClip
      mindmap.updateSegmentLive(st.id, { clip: newClip })
    }
  }

  function onPointerUp(): void {
    const st = interaction.value

    if (st.kind === 'creating') {
      const draft = draftRect.value
      interaction.value = { kind: 'idle' }
      if (!draft) return

      // Слишком маленький → трактуем как клик, а не drag
      if (draft.w < MIN_SIZE * 2 || draft.h < MIN_SIZE * 2) return

      const sid = sourceId.value
      if (!sid) return

      const newId = mindmap.addSegment(sid, sanitizeRect(draft))
      if (newId) selectedId.value = newId
      return
    }

    if (st.kind === 'moving' || st.kind === 'resizing') {
      // Если ничего не изменилось — просто выходим из FSM
      if (sameRect(st.startClip, st.lastClip)) {
        interaction.value = { kind: 'idle' }
        return
      }

      // Финальный commit:
      // 1) Откатываем live-state к startClip (сейчас он = lastClip).
      // 2) commitSegment(lastClip) — внутри сначала history.save() (snapshot
      //    со startClip!), затем применяет lastClip.
      // Так undo вернёт именно startClip, а не lastClip.
      mindmap.updateSegmentLive(st.id, { clip: st.startClip })
      mindmap.commitSegment(st.id, { clip: st.lastClip })

      interaction.value = { kind: 'idle' }
    }
  }

  /** Отмена текущего жеста (например, по Escape). */
  function cancelInteraction(): void {
    const st = interaction.value
    if (st.kind === 'moving' || st.kind === 'resizing') {
      // Откатываем превью к исходному состоянию без записи в историю
      mindmap.updateSegmentLive(st.id, { clip: st.startClip })
    }
    // Для 'creating' просто выходим — preview существовал только в draftRect
    interaction.value = { kind: 'idle' }
  }

  /** Полный сброс (при закрытии панели). */
  function reset(): void {
    cancelInteraction()
    selectedId.value = null
  }

  return {
    // state (read-only по контракту)
    segments,
    selectedId,
    selectedSegment,
    interaction,
    draftRect,

    // commands
    select,
    deleteSelected,
    renameSelected,

    // pointer FSM
    beginCreate,
    beginMove,
    beginResize,
    onPointerMove,
    onPointerUp,
    cancelInteraction,
    reset,
  }
}

type SegmentEditorApi = ReturnType<typeof useSegmentEditor>