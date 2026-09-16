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

const emit = defineEmits<{
  'sections-imported': [payload: { targetId: string; sections: Array<{ heading: string; content: string }> }]
}>()

function parseSectionsFromMarkdown(markdown: string): Array<{ heading: string; content: string }> {
  const lines = markdown.split(/\r?\n/)
  const sections: Array<{ heading: string; content: string }> = []
  let current: { heading: string; content: string[] } | null = null

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+?)\s*$/)
    if (match) {
      if (current) sections.push({ heading: current.heading, content: current.content.join('\n').trim() })
      current = { heading: match[2], content: [] }
    } else if (current) {
      current.content.push(line)
    }
  }
  if (current) sections.push({ heading: current.heading, content: current.content.join('\n').trim() })
  return sections
}

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

  const sections = parseSectionsFromMarkdown(markdown)
  const count = mindmap.importMarkdownIntoNode(targetId, markdown)

  if (count > 0) {
    notify?.(
      `Импортировано узлов: ${count}`,
      'success',
      'mdi-language-markdown'
    )
    emit('sections-imported', { targetId, sections })
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
