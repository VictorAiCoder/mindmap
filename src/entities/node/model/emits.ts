// src/entities/node/model/emits.ts

export interface NodeImageEmits {
  /** Загружена новая картинка как dataUrl (через <input> или drop из ОС). */
  setImage: [dataUrl: string]
  /** Прикреплена существующая картинка из галереи по её id. */
  setImageById: [imageId: string]
}