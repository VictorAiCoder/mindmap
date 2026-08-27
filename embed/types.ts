import type { LayoutType } from '@features/layout/lib/types'
import type { EmbedSlots, EmbedNodeImageSlotProps, EmbedNodeNotesSlotProps, EmbedNodeMenuSlotProps } from './injection-keys'

export type { LayoutType }
export type { EmbedSlots, EmbedNodeImageSlotProps, EmbedNodeNotesSlotProps, EmbedNodeMenuSlotProps }

export interface MindmapViewerProps {
  markdown: string
  layout?: LayoutType
  showNotes?: boolean
  showImages?: boolean
  height?: string
  class?: string
}
