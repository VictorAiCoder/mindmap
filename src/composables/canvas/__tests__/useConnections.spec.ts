import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useConnections, type GetLivePosition } from '../useConnections'
import type { MindMapNode } from '@entities/node'
import type { LayoutData, LayoutPosition } from '@/types/layout'

// ---------- Фабрики тестовых данных ----------

const makeNode = (
  id: string,
  children: MindMapNode[] = [],
  overrides: Partial<MindMapNode> = {}
): MindMapNode => ({
  id,
  title: id,
  children,
  collapsed: false,
  color: '',
  ...overrides,
} as MindMapNode)

const makePos = (
  id: string,
  x: number,
  y: number,
  w = 100,
  h = 40,
  depth = 0
): LayoutPosition => ({ id, x, y, w, h, depth } as LayoutPosition)

const makeLayout = (positions: LayoutPosition[]): LayoutData => ({
  positions,
  bounds: { minX: 0, minY: 0, maxX: 1000, maxY: 1000 },
} as LayoutData)

// Провайдер, который всегда возвращает null (никто не тянется)
const noLive: GetLivePosition = () => null

// ---------- Тесты ----------

describe('useConnections', () => {
  describe('пустые состояния', () => {
    it('возвращает пустой массив, если в layoutData нет позиций', () => {
      const root = ref(makeNode('root'))
      const layout = ref(makeLayout([]))
      const conns = useConnections(root, layout, noLive)
      expect(conns.value).toEqual([])
    })

    it('возвращает пустой массив для корня без детей', () => {
      const root = ref(makeNode('root'))
      const layout = ref(makeLayout([makePos('root', 0, 0)]))
      const conns = useConnections(root, layout, noLive)
      expect(conns.value).toEqual([])
    })
  })

  describe('построение связей', () => {
    it('строит одну связь для root → child', () => {
      const child = makeNode('c1', [], { color: '#f00' })
      const root = ref(makeNode('root', [child]))
      const layout = ref(
        makeLayout([makePos('root', 0, 0), makePos('c1', 200, 0)])
      )
      const conns = useConnections(root, layout, noLive)

      expect(conns.value).toHaveLength(1)
      expect(conns.value[0]).toMatchObject({
        id: 'root__c1',
        parentId: 'root',
        childId: 'c1',
        color: '#f00',
      })
      expect(conns.value[0].path).toMatch(/^M .+ C .+ \d/)
    })

    it('рекурсивно обходит дерево', () => {
      const grandchild = makeNode('gc1')
      const child = makeNode('c1', [grandchild])
      const root = ref(makeNode('root', [child]))
      const layout = ref(
        makeLayout([
          makePos('root', 0, 0),
          makePos('c1', 200, 0),
          makePos('gc1', 400, 0),
        ])
      )
      const conns = useConnections(root, layout, noLive)

      expect(conns.value).toHaveLength(2)
      expect(conns.value.map((c) => c.id)).toEqual(['root__c1', 'c1__gc1'])
    })

    it('использует fallback-цвет "#999", если у child нет цвета', () => {
      const child = makeNode('c1', [], { color: '' })
      const root = ref(makeNode('root', [child]))
      const layout = ref(
        makeLayout([makePos('root', 0, 0), makePos('c1', 200, 0)])
      )
      const conns = useConnections(root, layout, noLive)

      expect(conns.value[0].color).toBe('#999')
    })
  })

  describe('collapsed-узлы', () => {
    it('не строит связи от collapsed-узла к его детям', () => {
      const grandchild = makeNode('gc1')
      const child = makeNode('c1', [grandchild], { collapsed: true })
      const root = ref(makeNode('root', [child]))
      const layout = ref(
        makeLayout([
          makePos('root', 0, 0),
          makePos('c1', 200, 0),
          // gc1 в layout может и отсутствовать, но это не важно
        ])
      )
      const conns = useConnections(root, layout, noLive)

      // root → c1 есть, c1 → gc1 нет
      expect(conns.value).toHaveLength(1)
      expect(conns.value[0].id).toBe('root__c1')
    })
  })

  describe('отсутствие позиций', () => {
    it('пропускает ребёнка, если его позиции нет в layout', () => {
      const child = makeNode('c1')
      const root = ref(makeNode('root', [child]))
      // c1 отсутствует в layout
      const layout = ref(makeLayout([makePos('root', 0, 0)]))
      const conns = useConnections(root, layout, noLive)

      expect(conns.value).toEqual([])
    })
  })

  describe('интеграция с live-позициями', () => {
    it('использует live-координаты, если getLivePosition вернул их', () => {
      const child = makeNode('c1')
      const root = ref(makeNode('root', [child]))
      const layout = ref(
        makeLayout([makePos('root', 0, 0), makePos('c1', 200, 0)])
      )

      // c1 якобы тянется — сдвинут на (50, 50)
      const live: GetLivePosition = (id) =>
        id === 'c1' ? { x: 250, y: 50 } : null

      const conns = useConnections(root, layout, live)
      // В пути должна появиться конечная точка на Y ≈ 70 (50 + h/2)
      expect(conns.value[0].path).toContain(' 250 ')
      expect(conns.value[0].path).toMatch(/ 70$/)
    })

    it('передаёт в getLivePosition id и оригинальные x/y из layout', () => {
      const child = makeNode('c1')
      const root = ref(makeNode('root', [child]))
      const layout = ref(
        makeLayout([makePos('root', 0, 0), makePos('c1', 200, 100)])
      )
      const spy = vi.fn<GetLivePosition>().mockReturnValue(null)

      const conns = useConnections(root, layout, spy)
      // Форсируем вычисление
      void conns.value

      expect(spy).toHaveBeenCalledWith('root', 0, 0)
      expect(spy).toHaveBeenCalledWith('c1', 200, 100)
    })
  })

  describe('реактивность', () => {
    it('пересчитывается при изменении layoutData', () => {
      const child = makeNode('c1')
      const root = ref(makeNode('root', [child]))
      const layout = ref(
        makeLayout([makePos('root', 0, 0), makePos('c1', 200, 0)])
      )
      const conns = useConnections(root, layout, noLive)

      const pathBefore = conns.value[0].path

      // Двигаем c1
      layout.value = makeLayout([
        makePos('root', 0, 0),
        makePos('c1', 500, 0),
      ])

      expect(conns.value[0].path).not.toBe(pathBefore)
      expect(conns.value[0].path).toContain(' 500 ')
    })
  })
})