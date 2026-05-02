// src/composables/tree/useNodeFactory.ts
import { NODE_COLORS, DEFAULT_COLOR } from '../constants'
import type { MindMapNode } from '@/types/mindmap'
import type { MindMapDocument } from '@/types/mindmap'

/**
 * Опции для createNode — все поля узла, но опциональные.
 * children, если заданы, должны быть уже валидными узлами.
 */
export type CreateNodeOptions = Partial<MindMapNode>

let counter = 0

function generateId(): string {
  const random = Math.random().toString(36).slice(2, 7)
  return `node_${Date.now()}_${++counter}_${random}`
}

/**
 * Не используется, но оставляем — пригодится для автокраски.
 * TS будет ругаться на unused → добавим export.
 */
export function pickRandomColor(): string {
  const index = Math.floor(Math.random() * NODE_COLORS.length)
  // ★ noUncheckedIndexedAccess: TS считает, что индекс может вернуть undefined
  return NODE_COLORS[index] ?? DEFAULT_COLOR
}

/**
 * Создаёт узел со всеми полями, заполненными по умолчанию.
 * Возвращает полноценный MindMapNode — все инварианты соблюдены.
 */
export function createNode(opts: CreateNodeOptions = {}): MindMapNode {
  return {
    id: opts.id ?? generateId(),
    text: opts.text ?? 'Новый узел',
    color: opts.color ?? '#5C6BC0',
    children: opts.children ?? [],
    collapsed: opts.collapsed ?? false,
    notes: opts.notes ?? '',
    imageId: opts.imageId ?? null,
    imageWidth: opts.imageWidth ?? null,
    customX: opts.customX ?? null,
    customY: opts.customY ?? null,
    // notesPinned, notesVisible — НЕ задаём, остаются undefined
    ...(opts.notesPinned !== undefined && { notesPinned: opts.notesPinned }),
    ...(opts.notesVisible !== undefined && { notesVisible: opts.notesVisible })
  }
}

export function createDefaultDocument(): MindMapDocument {
  return {
    version: 2,
    root: createDefaultTree(),
    images: [],
  }
}

export function createDefaultTree(): MindMapNode {
  return createNode({
    text: 'Главная идея',
    color: DEFAULT_COLOR,
    children: [
      createNode({
        text: 'Подтема 1',
        color: '#26A69A',
        notes: '**Важно:** проработать детали\n\n- пункт 1\n- пункт 2',
        children: [
          createNode({ text: 'Детали 1.1', color: '#66BB6A' })
        ]
      }),
      createNode({ text: 'Подтема 2', color: '#FF7043' }),
      createNode({ text: 'Подтема 3', color: '#AB47BC' })
    ]
  })
}