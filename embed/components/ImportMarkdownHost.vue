<!-- embed/components/ImportMarkdownHost.vue -->
<!--
  Глобальный хост для модалки импорта Markdown.
  Подключается один раз в App.vue рядом с MindMap.
  Читает состояние из useNodeMenu, вызывает mindmap API.
-->
<template>
  <ImportMarkdownDialog
    v-model="dialogOpen"
    @confirm="onConfirm"
  />
</template>

<script setup lang="ts">
import { computed, inject, type InjectionKey } from 'vue'
import ImportMarkdownDialog from './ImportMarkdownDialog.vue'
import { useNodeMenu } from '../composables/useNodeMenu'
import { mindMapKey, notifyKey } from '../injection-keys'

function injectStrict<T>(key: InjectionKey<T>): T {
  const value = inject(key)
  if (value === undefined) throw new Error(`Missing provide for injection key: ${String(key)}`)
  return value
}

const {
  importDialogOpen,
  importDialogTargetId,
  closeImportDialog,
} = useNodeMenu()

const mindmap = injectStrict(mindMapKey)
// notify опционален — если не предоставлен, молча пишем в console
const notify = inject(notifyKey, null)

const dialogOpen = computed<boolean>({
  get: () => importDialogOpen.value,
  set: (v) => {
    if (!v) closeImportDialog()
  },
})

function onConfirm(markdown: string) {
  const targetId = importDialogTargetId.value
  if (!targetId) {
    closeImportDialog()
    return
  }

  const count = mindmap.importMarkdownIntoNode(targetId, markdown)

  if (count > 0) {
    notify?.(
      `Импортировано узлов: ${count}`,
      'success',
      'mdi-language-markdown'
    )
  } else {
    notify?.(
      'Не удалось импортировать — проверьте формат Markdown',
      'warning',
      'mdi-alert'
    )
  }

  closeImportDialog()
}
</script>
