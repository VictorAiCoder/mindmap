// src/composables/useImageHandler.js
const MAX_IMAGE_SIZE = 2 * 1024 * 1024
const MAX_DIMENSION = 800

export function processImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Файл не является изображением'))
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      reject(new Error('Файл слишком большой (макс. 2MB)'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Ошибка чтения'))

    reader.onload = (e) => {
      resizeImage(e.target.result).then(resolve).catch(reject)
    }

    reader.readAsDataURL(file)
  })
}

function resizeImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      if (img.width <= MAX_DIMENSION && img.height <= MAX_DIMENSION) {
        resolve(dataUrl)
        return
      }

      const scale = Math.min(MAX_DIMENSION / img.width, MAX_DIMENSION / img.height)
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale
      canvas.height = img.height * scale

      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.src = dataUrl
  })
}

export function getImageFromDrop(e) {
  const files = e.dataTransfer?.files
  if (!files?.length) return null
  const file = files[0]
  return file.type.startsWith('image/') ? file : null
}