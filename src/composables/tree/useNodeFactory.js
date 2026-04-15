// src/composables/tree/useNodeFactory.js
import { NODE_COLORS, DEFAULT_COLOR } from '../../constants'

let counter = 0

function generateId() {
  return `node_${Date.now()}_${++counter}_${Math.random().toString(36).slice(2, 7)}`
}

function pickRandomColor() {
  return NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)]
}

export function createNode(opts = {}) {
  return {
    id: opts.id || generateId(),
    text: opts.text || 'Новый узел',
    color: opts.color || '#5C6BC0',
    children: opts.children || [],
    collapsed: opts.collapsed || false,
    notes: opts.notes || '',
    image: opts.image || null,
    imageWidth: opts.imageWidth ?? null,   // ★ null = авто (дефолт 160px)
    customX: opts.customX ?? null,
    customY: opts.customY ?? null
  }
}

export function createDefaultTree() {
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