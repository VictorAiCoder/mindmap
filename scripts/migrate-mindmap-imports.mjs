#!/usr/bin/env node
/**
 * Миграция импортов из @/types/mindmap → entities barrels.
 *
 * Использование:
 *   node scripts/migrate-mindmap-imports.mjs          # dry-run (показывает diff)
 *   node scripts/migrate-mindmap-imports.mjs --apply  # применяет изменения
 *
 * Безопасность:
 *   - Работает только с явно перечисленными файлами
 *   - Идемпотентен (повторный запуск ничего не сломает)
 *   - Dry-run по умолчанию
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const APPLY = process.argv.includes('--apply')

// ════════════════════════════════════════════════════════════
// Карта: тип → entity barrel
// ════════════════════════════════════════════════════════════
const TYPE_TO_ENTITY = {
  MindMapNode:     '@entities/node',
  ScenePosition:   '@entities/node',
  Center2D:        '@entities/node',
  Clip:            '@entities/image',
  RawImage:        '@entities/image',
  ImageSegment:    '@entities/image',
  StoredImage:     '@entities/image',
  MindMapDocument: '@entities/mindmap',
}

// ════════════════════════════════════════════════════════════
// Список файлов (29 импортов из grep)
// ════════════════════════════════════════════════════════════
const FILES = [
  'src/components/node/NodeActionsMenu.vue',
  'src/components/node/NodeImage.vue',
  'src/components/panels/ImageGalleryCard.vue',
  'src/components/panels/ImageGalleryPanel.vue',
  'src/components/panels/segment-editor/SegmentCanvas.vue',
  'src/components/panels/segment-editor/SegmentEditorPanel.vue',
  'src/composables/canvas/useConnections.ts',
  'src/composables/canvas/__tests__/useConnections.spec.ts',
  'src/composables/image/useImageStorage.ts',
  'src/composables/image/useSegmentEditor.ts',
  'src/composables/image/useSegmentOperations.ts',
  'src/composables/layout/layoutCompact.ts',
  'src/composables/layout/layoutMindMap.ts',
  'src/composables/layout/layoutRadial.ts',
  'src/composables/layout/layoutSpacious.ts',
  'src/composables/layout/layoutTreeDown.ts',
  'src/composables/layout/layoutTreeRight.ts',
  'src/composables/layout/layoutUtils.ts',
  'src/composables/layout/useAutoLayout.ts',
  'src/composables/layout/useLayout.ts',
  'src/composables/node/useNodeDisplay.ts',
  'src/composables/persistence/exportMarkdown.ts',
  'src/composables/persistence/importMarkdown.ts',
  'src/composables/persistence/usePersistence.ts',
  'src/composables/tree/useNodeFactory.ts',
  'src/composables/tree/useTreeOperations.ts',
  'src/composables/tree/useTreeTraversal.ts',
  'src/composables/useMindMap.ts',
]

// ════════════════════════════════════════════════════════════
// Regex: ловит и однострочные, и многострочные импорты типов
// из '@/types/mindmap' или '../../types/mindmap' (любая глубина ../)
//
// Флаг s (dotAll) — чтобы '.' матчил перенос строки внутри { ... }.
// ════════════════════════════════════════════════════════════
const IMPORT_RE =
  /import\s+type\s*\{([^}]+)\}\s*from\s*['"](?:@\/|(?:\.\.\/)+)types\/mindmap['"]/gs

let totalChanges = 0
let totalFiles = 0

for (const relPath of FILES) {
  const path = resolve(process.cwd(), relPath)
  let src
  try {
    src = readFileSync(path, 'utf8')
  } catch (e) {
    console.error(`❌ Не удалось прочитать ${relPath}:`, e.message)
    continue
  }

  const original = src

  src = src.replace(IMPORT_RE, (match, typesBlock) => {
    // Парсим список типов: режем по запятым, чистим пробелы/переносы
    const types = typesBlock
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
      // Убираем возможные комментарии в конце строки (// ★ + Clip)
      .map(t => t.replace(/\s*\/\/.*$/, '').trim())
      .filter(Boolean)

    // Группируем по entity
    const byEntity = {}
    const unknown = []
    for (const type of types) {
      const entity = TYPE_TO_ENTITY[type]
      if (!entity) {
        unknown.push(type)
        continue
      }
      ;(byEntity[entity] ??= []).push(type)
    }

    if (unknown.length) {
      console.error(
        `❌ ${relPath}: неизвестные типы [${unknown.join(', ')}] — пропускаю файл`,
      )
      return match // не меняем
    }

    // Собираем новые импорты (детерминированный порядок)
    const order = ['@entities/node', '@entities/image', '@entities/mindmap']
    const newImports = order
      .filter(e => byEntity[e])
      .map(e => `import type { ${byEntity[e].join(', ')} } from '${e}'`)
      .join('\n')

    return newImports
  })

  if (src !== original) {
    totalFiles++
    const matches = original.match(IMPORT_RE) ?? []
    totalChanges += matches.length

    console.log(`\n${'═'.repeat(60)}`)
    console.log(`📝 ${relPath}`)
    console.log('═'.repeat(60))
    // Простой diff: показываем старый и новый импорт-блоки
    const oldBlocks = original.match(IMPORT_RE) ?? []
    const newBlocks = src.match(
      /import\s+type\s*\{[^}]+\}\s*from\s*['"]@entities\/[^'"]+['"]/g,
    ) ?? []
    console.log('— БЫЛО:')
    oldBlocks.forEach(b => console.log('   ' + b.replace(/\n/g, '\n   ')))
    console.log('+ СТАЛО:')
    // Показываем только новые блоки (могут быть и старые из других мест)
    const onlyNew = newBlocks.filter(b => !original.includes(b))
    onlyNew.forEach(b => console.log('   ' + b))

    if (APPLY) {
      writeFileSync(path, src, 'utf8')
    }
  }
}

console.log(`\n${'═'.repeat(60)}`)
console.log(
  `Файлов изменено: ${totalFiles}, импорт-блоков заменено: ${totalChanges}`,
)
console.log(APPLY ? '✅ Изменения применены' : '🔍 Dry-run (используй --apply)')
console.log('═'.repeat(60))