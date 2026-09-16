import type { InjectionKey, Ref, Slots, VNode } from 'vue'
import type { MindMapNode } from '@entities/node'
import type { Clip } from '@entities/image/model/types'
import type { ImageStorageApi } from './types/image-storage'
import type { MindMapApi } from './types/mindmap-api'

// ─── Feature injection keys (moved from src/app/providers/injection-keys) ───

export type NotifyColor = 'success' | 'error' | 'info' | 'warning'

export type NotifyFn = (
  text: string,
  color?: NotifyColor,
  icon?: string
) => void

export const mindMapKey: InjectionKey<MindMapApi> = Symbol('mindmap')
export const notifyKey: InjectionKey<NotifyFn> = Symbol('notify')

// ─── Embed slot types ───────────────────────────────────────────────────────

export interface EmbedNodeImageSlotProps {
  node: MindMapNode
  src: string
  clip: Clip | null
  isRoot: boolean
  imageWidth: number | null
  scale: number
}

export interface EmbedNodeNotesSlotProps {
  node: MindMapNode
  notes: string
  color: string
  isExpanded: boolean
  isLong: boolean
}

export interface EmbedNodeMenuSlotProps {
  node: MindMapNode
  isRoot: boolean
  isLeaf: boolean
  hasNotes: boolean
  hasChildren: boolean
  hasImage: boolean
}

export type ImageSlot = (props: EmbedNodeImageSlotProps) => VNode[]
export type NotesSlot = (props: EmbedNodeNotesSlotProps) => VNode[]
export type MenuSlot = (props: EmbedNodeMenuSlotProps) => VNode[]

export interface EmbedSlots {
  image?: ImageSlot
  notes?: NotesSlot
  menu?: MenuSlot
}

export const embedSlotsKey: InjectionKey<EmbedSlots> = Symbol('embed-slots')

// ─── Global zoom & image storage ────────────────────────────────────────────

export const globalZoomKey: InjectionKey<Ref<number>> = Symbol('globalZoom')
export const imageStorageKey: InjectionKey<ImageStorageApi | null> = Symbol('imageStorage')
