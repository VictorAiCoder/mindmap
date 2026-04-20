import { describe, it, expect } from 'vitest'
import { calcBezierPath, type NodeBox } from '../bezier'

// Хелпер для компактного создания боксов
const box = (x: number, y: number, w = 100, h = 40): NodeBox => ({ x, y, w, h })

describe('calcBezierPath', () => {
  describe('выбор стороны подключения', () => {
    it('соединяет правую грань parent с левой гранью child, если child правее', () => {
      const parent = box(0, 0, 100, 40)      // центр X = 50
      const child = box(200, 100, 100, 40)   // центр X = 250
      const path = calcBezierPath(parent, child)

      // start = (100, 20) — правая грань parent, середина по Y
      // end   = (200, 120) — левая грань child, середина по Y
      expect(path).toMatch(/^M 100 20 /)
      expect(path).toMatch(/ 200 120$/)
    })

    it('соединяет левую грань parent с правой гранью child, если child левее', () => {
      const parent = box(200, 0, 100, 40)    // центр X = 250
      const child = box(0, 100, 100, 40)     // центр X = 50
      const path = calcBezierPath(parent, child)

      // start = (200, 20) — левая грань parent
      // end   = (100, 120) — правая грань child
      expect(path).toMatch(/^M 200 20 /)
      expect(path).toMatch(/ 100 120$/)
    })

    it('при совпадающих центрах по X выбирает ветку "child справа" (>=)', () => {
      const parent = box(0, 0, 100, 40)
      const child = box(0, 100, 100, 40)     // тот же центр X

      const path = calcBezierPath(parent, child)

      // По текущей логике (>=) — идёт через правую грань parent
      expect(path).toMatch(/^M 100 20 /)
      expect(path).toMatch(/ 0 120$/)
    })
  })

  describe('контрольные точки кубической кривой', () => {
    it('размещает обе контрольные точки на середине расстояния по X', () => {
      const parent = box(0, 0, 100, 40)      // end start = (100, 20)
      const child = box(300, 0, 100, 40)     // end = (300, 20)
      const path = calcBezierPath(parent, child)

      // dx = (300 - 100) / 2 = 100
      // c1 = (200, 20), c2 = (200, 20)
      expect(path).toBe('M 100 20 C 200 20 200 20 300 20')
    })

    it('контрольные точки сохраняют Y начальной и конечной точек (горизонтальный выход/вход)', () => {
      const parent = box(0, 0, 100, 40)      // start Y = 20
      const child = box(300, 200, 100, 60)   // end Y = 230
      const path = calcBezierPath(parent, child)

      // c1y = 20 (Y старта), c2y = 230 (Y конца)
      // dx = (300 - 100) / 2 = 100 → c1x=200, c2x=200
      expect(path).toBe('M 100 20 C 200 20 200 230 300 230')
    })
  })

  describe('формат вывода', () => {
    it('возвращает валидный SVG path: M x y C c1x c1y c2x c2y x y', () => {
      const path = calcBezierPath(box(0, 0), box(200, 100))
      expect(path).toMatch(
        /^M -?\d+(\.\d+)? -?\d+(\.\d+)? C -?\d+(\.\d+)? -?\d+(\.\d+)? -?\d+(\.\d+)? -?\d+(\.\d+)? -?\d+(\.\d+)? -?\d+(\.\d+)?$/
      )
    })
  })

  describe('граничные случаи', () => {
    it('работает с очень близкими узлами (малый dx)', () => {
      const parent = box(0, 0, 100, 40)
      const child = box(101, 0, 100, 40)
      const path = calcBezierPath(parent, child)

      // dx = (101 - 100) / 2 = 0.5
      expect(path).toBe('M 100 20 C 100.5 20 100.5 20 101 20')
    })

    it('работает с нулевыми размерами узлов', () => {
      const parent = box(0, 0, 0, 0)
      const child = box(100, 100, 0, 0)
      const path = calcBezierPath(parent, child)

      expect(path).toBe('M 0 0 C 50 0 50 100 100 100')
    })
  })
})