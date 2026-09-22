import type { Clip } from '@entities/image'

export interface SegmentOperationsApi {
  addSegment(sourceId: string, clip: Clip, name?: string): string | null

  updateSegmentLive(
    id: string,
    patch: Partial<{
      clip: Clip
      name: string
    }>
  ): void

  commitSegment(
    id: string,
    patch: Partial<{
      clip: Clip
      name: string
    }>
  ): void

  deleteSegment(id: string): void
  renameSegment(id: string, name: string): void
}
