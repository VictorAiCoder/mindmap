// ============================================================================
// Константы
// ============================================================================

const MAX_IMAGE_DIMENSION = 1920  // макс. сторона после ресайза (px)
const JPEG_QUALITY = 0.85
const ACCEPTED_MIME_PREFIX = 'image/'

// ============================================================================
// Типы
// ============================================================================

interface ResizeOptions {
  maxDimension?: number
  quality?: number
}

// ============================================================================
// Внутренние функции
// ============================================================================

/**
 * Читает File как data URL (base64).
 */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('FileReader: результат не является строкой'))
        return
      }
      resolve(result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('FileReader: неизвестная ошибка'))
    reader.readAsDataURL(file)
  })
}

/**
 * Ресайзит картинку до maxDimension по большей стороне.
 * Возвращает новый data URL (JPEG).
 */
function resizeImage(dataUrl: string, options: ResizeOptions = {}): Promise<string> {
  const { maxDimension = MAX_IMAGE_DIMENSION, quality = JPEG_QUALITY } = options

  return new Promise<string>((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      try {
        const { width, height } = img
        const scale = Math.min(1, maxDimension / Math.max(width, height))
        const targetW = Math.round(width * scale)
        const targetH = Math.round(height * scale)

        const canvas = document.createElement('canvas')
        canvas.width = targetW
        canvas.height = targetH

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas 2D context недоступен'))
          return
        }

        ctx.drawImage(img, 0, 0, targetW, targetH)
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)))
      }
    }

    img.onerror = () => reject(new Error('Не удалось загрузить изображение для ресайза'))
    img.src = dataUrl
  })
}

// ============================================================================
// Публичный API
// ============================================================================

/**
 * Обрабатывает загруженный файл: читает → ресайзит → возвращает data URL.
 */
export async function processImageFile(file: File): Promise<string> {
  if (!file.type.startsWith(ACCEPTED_MIME_PREFIX)) {
    throw new Error(`Неподдерживаемый тип файла: ${file.type || 'неизвестно'}`)
  }

  const originalDataUrl = await readFileAsDataUrl(file)
  const resized = await resizeImage(originalDataUrl)
  return resized
}

/**
 * Извлекает первый image-файл из события drag&drop.
 * Возвращает null, если картинок нет.
 */
export function getImageFromDrop(event: DragEvent): File | null {
  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return null

  for (const file of files) {
    if (file.type.startsWith(ACCEPTED_MIME_PREFIX)) {
      return file
    }
  }
  return null
}