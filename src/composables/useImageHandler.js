// src/composables/useImageHandler.js
// Обработка загрузки и сжатия картинок
import { IMAGE_THUMB_WIDTH, IMAGE_THUMB_HEIGHT, MAX_IMAGE_SIZE } from './constants'

/**
 * Сжимает изображение до thumbnail-размера и возвращает Data URL
 */
function compressImage(file, maxW = IMAGE_THUMB_WIDTH, maxH = IMAGE_THUMB_HEIGHT) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Ошибка чтения файла'))

    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error('Не удалось загрузить изображение'))

      img.onload = () => {
        const canvas = document.createElement('canvas')

        // Вписываем в maxW × maxH сохраняя пропорции
        let w = img.width
        let h = img.height

        if (w > maxW) { h = h * (maxW / w); w = maxW }
        if (h > maxH) { w = w * (maxH / h); h = maxH }

        canvas.width = Math.round(w)
        canvas.height = Math.round(h)

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // Пробуем WebP, fallback на JPEG
        let dataUrl = canvas.toDataURL('image/webp', 0.7)
        if (dataUrl.length > MAX_IMAGE_SIZE) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.6)
        }

        resolve(dataUrl)
      }

      img.src = e.target.result
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Валидирует что файл — изображение
 */
function isImageFile(file) {
  return file && file.type.startsWith('image/')
}

/**
 * Обработка файла: валидация + сжатие
 */
export async function processImageFile(file) {
  if (!isImageFile(file)) {
    throw new Error('Файл должен быть изображением')
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Файл слишком большой (макс. 10 МБ)')
  }

  return compressImage(file)
}

/**
 * Извлекает файл изображения из события drag & drop
 */
export function getImageFromDrop(e) {
  const files = e.dataTransfer?.files
  if (!files?.length) return null

  const file = files[0]
  return isImageFile(file) ? file : null
}

/**
 * Извлекает файл из input[type=file]
 */
export function getImageFromInput(e) {
  const file = e.target?.files?.[0]
  return file && isImageFile(file) ? file : null
}