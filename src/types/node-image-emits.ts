// src/types/node-image-emits.ts

/**
 * Узкий контракт emit'ов, которые использует composable useNodeImage.
 * Это подмножество эмитов MapNode, относящееся только к работе
 * с картинкой узла.
 *
 * Если в MapNode появятся новые emit'ы, не связанные с картинкой —
 * этот тип трогать не нужно.
 */
export interface NodeImageEmits {
  /** Загружена новая картинка как dataUrl (через <input> или drop из ОС). */
  setImage: [dataUrl: string]
  /** Прикреплена существующая картинка из галереи по её id. */
  setImageById: [imageId: string]
}