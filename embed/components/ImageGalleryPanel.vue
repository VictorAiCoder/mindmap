<!-- embed/components/ImageGalleryPanel.vue -->
<template>
  <v-navigation-drawer
    v-model="isOpen"
    location="left"
    temporary
    width="360"
    class="gallery-drawer"
  >
    <!-- Header -->
    <div class="gallery-header pa-3">
      <div class="d-flex align-center justify-space-between mb-2">
        <div class="d-flex align-center ga-2">
          <v-icon icon="mdi-image-multiple" color="primary" />
          <span class="text-h6">Галерея</span>
          <v-chip size="x-small" variant="tonal">
            {{ imageStorage.totalCount.value }}
          </v-chip>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="isOpen = false"
        />
      </div>

      <v-text-field
        v-model="search"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        placeholder="Поиск по имени…"
        prepend-inner-icon="mdi-magnify"
      />

      <div class="d-flex align-center ga-2 mt-2">
        <v-btn-toggle
          v-model="filter"
          density="compact"
          variant="outlined"
          mandatory
          divided
        >
          <v-btn value="all" size="small">
            Все
            <v-chip size="x-small" class="ml-1">{{ imageStorage.totalCount.value }}</v-chip>
          </v-btn>
          <v-btn value="unused" size="small">
            Неисп.
            <v-chip
              size="x-small"
              class="ml-1"
              :color="mindmap.unusedImageCount.value > 0 ? 'warning' : undefined"
            >
              {{ mindmap.unusedImageCount.value }}
            </v-chip>
          </v-btn>
        </v-btn-toggle>

        <v-spacer />

        <v-btn
          icon="mdi-broom"
          variant="text"
          size="small"
          :disabled="mindmap.unusedImageCount.value === 0"
          @click="handlePurgeUnused"
        >
          <v-icon icon="mdi-broom" />
          <v-tooltip activator="parent" location="bottom">
            Удалить все неиспользуемые
          </v-tooltip>
        </v-btn>
      </div>
    </div>

    <v-divider />

    <!-- ★ Сетка 2×N -->
    <div class="gallery-grid pa-2">
      <template v-if="filteredImages.length">
        <ImageGalleryCard
          v-for="img in filteredImages"
          :key="img.id"
          :image="img"
          :usage-count="usageIndex.get(img.id)?.length ?? 0"
          @rename="handleRename(img.id, $event)"
          @delete="handleDelete(img.id)"
          @highlight="handleHighlight(img.id)"
          @dropped="emit('dropped')"
        />
      </template>
      <div v-else class="empty-state text-center text-medium-emphasis pa-8">
        <v-icon icon="mdi-image-off-outline" size="48" class="mb-2" />
        <div class="text-body-2">
          {{ search ? 'Ничего не найдено' : 'Нет картинок' }}
        </div>
      </div>
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { ref, computed, inject, type InjectionKey } from 'vue'
import ImageGalleryCard from './ImageGalleryCard.vue'

import { mindMapKey, notifyKey } from '../injection-keys'

import type { MindMapNode } from '@entities/node'
import type { StoredImage } from '@entities/image'

function injectStrict<T>(key: InjectionKey<T>): T {
  const value = inject(key)
  if (value === undefined) throw new Error(`Missing provide for injection key: ${String(key)}`)
  return value
}

// ─── Props / Emits (v-model) ────────────────
const props = withDefaults(defineProps<{
  modelValue?: boolean
}>(), {
  modelValue: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'highlight-nodes': [nodeIds: string[]]
  'dropped': []
}>()

const isOpen = computed<boolean>({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

// ─── Инжекции ───────────────────────────────
const mindmap = injectStrict(mindMapKey)
const notify = injectStrict(notifyKey)

const imageStorage = mindmap.imageStorage

// ─── Индекс использования (imageId → nodeId[]) ─
const usageIndex = computed<Map<string, string[]>>(() => {
  const map = new Map<string, string[]>()
  const root = mindmap.rootNode.value
  if (!root) return map

  const stack: MindMapNode[] = [root]
  while (stack.length) {
    const node = stack.pop()!
    if (node.imageId) {
      const arr = map.get(node.imageId)
      if (arr) arr.push(node.id)
      else map.set(node.imageId, [node.id])
    }
    if (node.children?.length) stack.push(...node.children)
  }
  return map
})

// ─── Фильтрация ─────────────────────────────
const search = ref<string>('')
const filter = ref<'all' | 'unused'>('all')

const filteredImages = computed<StoredImage[]>(() => {
  const q = search.value.trim().toLowerCase()
  const raw = imageStorage?.images?.value
  let list: readonly StoredImage[] = Array.isArray(raw) ? raw : []

  if (filter.value === 'unused') {
    list = list.filter(img => !usageIndex.value.has(img.id))
  }

  if (q) {
    list = list.filter(img => (img.name ?? '').toLowerCase().includes(q))
  }

  return [...list].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
})

// ─── Handlers ───────────────────────────────
function handleRename(id: string, newName: string) {
  imageStorage.rename(id, newName)
  notify('Переименовано', 'success', 'mdi-pencil')
}

function handleDelete(id: string) {
  const usages = usageIndex.value.get(id) ?? []
  const img = imageStorage?.images?.value?.find?.(i => i.id === id)

  if (usages.length > 0) {
    const ok = confirm(
      `Картинка используется в ${usages.length} узел(ах). ` +
      `Открепить и удалить?`
    )
    if (!ok) return

    detachImageFromNodes(id)
  }

  imageStorage.remove(id)
  notify(
    `Удалено: «${img?.name ?? 'Без имени'}»`,
    'info',
    'mdi-delete-outline'
  )
}

function handlePurgeUnused() {
  const unused = (imageStorage?.images?.value ?? []).filter(
    img => !usageIndex.value.has(img.id)
  )
  if (unused.length === 0) return

  const ok = confirm(`Удалить ${unused.length} неиспользуемых картинок?`)
  if (!ok) return

  for (const img of unused) imageStorage.remove(img.id)
  notify(
    `Удалено неиспользуемых: ${unused.length}`,
    'success',
    'mdi-broom'
  )
}

function handleHighlight(id: string) {
  const nodeIds = usageIndex.value.get(id) ?? []
  if (nodeIds.length === 0) {
    notify('Картинка нигде не используется', 'info', 'mdi-information')
    return
  }
  emit('highlight-nodes', nodeIds)
}

function detachImageFromNodes(imageId: string) {
  const root = mindmap.rootNode.value
  if (!root) return

  const stack: MindMapNode[] = [root]
  while (stack.length) {
    const node = stack.pop()!
    if (node.imageId === imageId) {
      node.imageId = null
    }
    if (node.children?.length) stack.push(...node.children)
  }
}
</script>

<style scoped>
.gallery-drawer :deep(.v-navigation-drawer__content) {
  display: flex;
  flex-direction: column;
}

.gallery-header {
  flex-shrink: 0;
  background: rgb(var(--v-theme-surface));
}

/* ★ Сетка вместо вертикального списка */
.gallery-grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  align-content: start;  /* карточки прижаты к верху, а не растягиваются */
}

/* Empty state на всю ширину сетки */
.empty-state {
  grid-column: 1 / -1;
}
</style>
