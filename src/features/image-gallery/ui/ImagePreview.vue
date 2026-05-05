<!-- src/components/panels/ImagePreview.vue -->
<template>
  <div
    class="img-preview"
    :class="{ 'img-preview--empty': !resolved }"
    :style="containerStyle"
  >
    <img
      v-if="resolved"
      :src="resolved.dataUrl"
      :alt="alt"
      class="img-preview__img"
      :style="imgStyle"
      draggable="false"
    />
    <v-icon
      v-else
      icon="mdi-image-broken-variant"
      size="32"
      color="grey-lighten-1"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import { injectStrict } from '@shared/lib/injectStrict'
import { mindMapKey } from '@/types/injection-keys'

const props = withDefaults(defineProps<{
  /** id картинки (raw или segment) */
  imageId: string | null | undefined
  alt?: string
  /** Режим вписывания: 'cover' — заполнить, 'contain' — целиком видно */
  fit?: 'cover' | 'contain'
}>(), {
  alt: '',
  fit: 'cover'
})

const mindmap = injectStrict(mindMapKey)

const resolved = computed(() =>
  mindmap.imageStorage.resolve(props.imageId)
)

/**
 * Магия CSS-обрезки сегмента:
 *
 * Контейнер показывает только окно clip × размер контейнера.
 * Картинка внутри увеличена так, что её видимая часть
 * (область clip от исходника) точно вписывается в контейнер.
 *
 * Формулы (нормализованный clip {x, y, w, h} в долях [0..1]):
 *   imgWidth  = 100% / clip.w   — масштабируем картинку, чтобы clip.w = 100%
 *   imgHeight = 100% / clip.h
 *   offsetX   = -clip.x * imgWidth   — смещаем влево, чтобы clip.x попал в 0
 *   offsetY   = -clip.y * imgHeight
 *
 * Для fit='contain' логика чуть сложнее (нужно letterbox), но для галереи
 * 'cover' выглядит лучше — карточка квадратная, превью заполняет её.
 */

const containerStyle = computed<CSSProperties>(() => ({
  // Контейнер сам определяет размер через классы родителя
  overflow: 'hidden',
  position: 'relative',
}))

const imgStyle = computed<CSSProperties>(() => {
  if (!resolved.value?.clip) {
    // Raw image — показываем целиком
    return {
      width: '100%',
      height: '100%',
      objectFit: props.fit,
      display: 'block',
    }
  }

  // Сегмент — CSS-clip через scale + translate
  const { x, y, w, h } = resolved.value.clip

  // Защита от деления на ноль (у валидных сегментов w/h >= 0.01,
  // но мало ли что прилетит)
  if (w <= 0 || h <= 0) {
    return { display: 'none' }
  }

  const scaleX = 1 / w   // ← во сколько раз увеличить, чтобы clip.w = 100%
  const scaleY = 1 / h

  if (props.fit === 'cover') {
    // Cover: заполняем контейнер, может обрезаться по короткой стороне
    return {
      position: 'absolute',
      width: `${scaleX * 100}%`,
      height: `${scaleY * 100}%`,
      left: `${-x * scaleX * 100}%`,
      top: `${-y * scaleY * 100}%`,
      objectFit: 'fill',
      display: 'block',
      maxWidth: 'none',
      maxHeight: 'none',
    }
  }

  // Contain: вписываем сегмент целиком (с letterbox)
  // Здесь нужен JS-расчёт по соотношению сторон контейнера и сегмента,
  // что без ResizeObserver будет неточно. Для галереи делаем 'cover'.
  // Если очень нужен 'contain' — можно добавить ResizeObserver, но это
  // отдельная задача.
  return {
    position: 'absolute',
    width: `${scaleX * 100}%`,
    height: `${scaleY * 100}%`,
    left: `${-x * scaleX * 100}%`,
    top: `${-y * scaleY * 100}%`,
    objectFit: 'fill',
    display: 'block',
    maxWidth: 'none',
    maxHeight: 'none',
  }
})
</script>

<style scoped>
.img-preview {
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.img-preview--empty {
  background: rgba(0, 0, 0, 0.08);
}

.img-preview__img {
  user-select: none;
  -webkit-user-drag: none;
}
</style>