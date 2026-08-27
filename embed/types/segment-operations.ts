export interface SegmentOperationsApi {
  addSegment(
    sourceId: string,
    clip: { x: number; y: number; w: number; h: number },
    name?: string
  ): string | null

  updateSegmentLive(
    id: string,
    patch: Partial<{
      clip: { x: number; y: number; w: number; h: number }
      name: string
    }>
  ): void

  commitSegment(
    id: string,
    patch: Partial<{
      clip: { x: number; y: number; w: number; h: number }
      name: string
    }>
  ): void

  deleteSegment(id: string): void
  renameSegment(id: string, name: string): void
}
