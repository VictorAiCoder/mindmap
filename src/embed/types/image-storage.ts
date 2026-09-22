import type { Ref, ComputedRef } from 'vue'
import type { StoredImage, ImageSegment, Clip } from '@entities/image'

export interface ResolvedImage {
  id: string
  dataUrl: string
  clip?: Clip
}

export interface ImageStorageApi {
  images: Readonly<Ref<readonly StoredImage[]>>
  resolve(id: string | null | undefined): ResolvedImage | null
  addRaw(dataUrl: string, name?: string): string
  remove(id: string): void
  rename(id: string, name: string): void
  totalCount: ComputedRef<number>
  addSegment(sourceId: string, clip: Clip, name?: string): string | null
  updateSegment(id: string, patch: Partial<{ clip: Clip; name: string }>): void
  listSegmentsOf(sourceId: string): readonly ImageSegment[]
}
