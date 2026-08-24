import type { LayoutType } from '../src/features/layout/lib/types'

export type { LayoutType }

export interface MindmapViewerProps {
  markdown: string
  layout?: LayoutType
  showNotes?: boolean
  showImages?: boolean
  height?: string
  class?: string
}
