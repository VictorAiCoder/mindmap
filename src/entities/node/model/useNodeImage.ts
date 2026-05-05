import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { processImageFile, getImageFromDrop } from '@/shared/lib/useImageHandler'
import type { LayoutPosition } from '@/features/layout'
import type { ImageStorageApi } from '@/types/mindmap-api'
import type { NodeImageEmits } from '@entities/node/model/emits'

/**
 * MIME-тип для drag&drop карточки из внутренней галереи.
 * Если где-то будет меняться — вынести в отдельную константу.
 */
const GALLERY_DND_MIME = 'application/x-mindmap-image-id'

/**
 * Тип значения, которое возвращает `imageStorage.resolve()`.
 * Используем ReturnType вместо явного импорта типа ResolvedImage —
 * composable устойчив к изменениям API storage.
 */
type ResolvedImage = ReturnType<ImageStorageApi['resolve']>

/** Тип emit-функции, сгенерированный defineEmits. */
type EmitFn = <K extends keyof NodeImageEmits>(
  event: K,
  ...args: NodeImageEmits[K]
) => void

export interface UseNodeImageReturn {
  /** Ref на скрытый <input type="file"> для programmatic click. */
  // imageInput: Ref<HTMLInputElement | null>
  /** Активна ли подсветка "на узел тянут картинку". */
  isImageDragOver: Ref<boolean>
  /** Резолвнутая картинка из storage или null. */
  resolvedImage: ComputedRef<ResolvedImage>
  /** Есть ли у узла картинка (и она успешно зарезолвлена). */
  hasImage: ComputedRef<boolean>
  /** Финальный src для <img>. Пустая строка если нет картинки. */
  imageSrc: ComputedRef<string>
  /** Программный клик по file-input (вызывается из меню). */
  triggerImageUpload: () => void
  /** Обработчик change у <input type="file">. */
  onImageSelected: () => Promise<void>
  /** Обработчик dragover на узле. */
  onImageDragOver: (e: DragEvent) => void
  /** Обработчик drop на узле. Поддерживает drop из галереи и из ОС. */
  onImageDrop: (e: DragEvent) => Promise<void>
}

/**
 * Логика работы с картинкой узла:
 *  - резолв картинки из storage по `node.imageId`
 *  - загрузка файла через <input type="file">
 *  - drag&drop файла из ОС или карточки из внутренней галереи
 *
 * @param pos     - Реактивный ref на LayoutPosition узла (через toRef)
 * @param storage - ImageStorageApi (nullable для совместимости со старым inject)
 * @param emit    - emit-функция с узким типом NodeImageEmits
 */
export function useNodeImage(
  pos: Ref<LayoutPosition>,
  storage: ImageStorageApi | null,
  emit: EmitFn,
): UseNodeImageReturn {
  const imageInput = ref<HTMLInputElement | null>(null)
  const isImageDragOver = ref<boolean>(false)

  const resolvedImage = computed<ResolvedImage>(() => {
    const id = pos.value.node.imageId
    if (!id || !storage) return null
    return storage.resolve(id)
  })

  const hasImage = computed<boolean>(() => resolvedImage.value !== null)
  const imageSrc = computed<string>(() => resolvedImage.value?.dataUrl ?? '')

  function triggerImageUpload(): void {
    imageInput.value?.click()
  }

  async function onImageSelected(): Promise<void> {
    const input = imageInput.value
    if (!input) return
    const file = input.files?.[0]
    if (!file) return
    input.value = ''
    try {
      emit('setImage', await processImageFile(file))
    } catch (err) {
      console.warn(
        'Image upload error:',
        err instanceof Error ? err.message : err,
      )
    }
  }

  function onImageDragOver(e: DragEvent): void {
    const types = e.dataTransfer?.types ?? []
    if (types.includes('Files') || types.includes(GALLERY_DND_MIME)) {
      isImageDragOver.value = true
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
  }

  async function onImageDrop(e: DragEvent): Promise<void> {
    isImageDragOver.value = false

    // 1) Drop карточки из внутренней галереи
    const galleryImageId = e.dataTransfer?.getData(GALLERY_DND_MIME)
    if (galleryImageId) {
      emit('setImageById', galleryImageId)
      return
    }

    // 2) Drop файла из ОС
    const file = getImageFromDrop(e)
    if (!file) return
    try {
      emit('setImage', await processImageFile(file))
    } catch (err) {
      console.warn(
        'Image drop error:',
        err instanceof Error ? err.message : err,
      )
    }
  }

  return {
    // imageInput,
    isImageDragOver,
    resolvedImage,
    hasImage,
    imageSrc,
    triggerImageUpload,
    onImageSelected,
    onImageDragOver,
    onImageDrop,
  }
}