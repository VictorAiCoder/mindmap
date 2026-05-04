// src/utils/bezier.ts

/**
 * Геометрический прямоугольник узла на канвасе.
 * Используется для расчёта соединительных кривых.
 */
export interface NodeBox {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Строит SVG-path для кубической кривой Безье между двумя узлами.
 *
 * Выбирает сторону подключения (право/лево) по положению центров:
 * если центр child правее центра parent — линия идёт из правой грани parent
 * в левую грань child, иначе наоборот.
 *
 * @returns Строка SVG path (например "M 10 20 C 50 20 50 40 90 40")
 */
export function calcBezierPath(parent: NodeBox, child: NodeBox): string {
  const pCx = parent.x + parent.w / 2
  const cCx = child.x + child.w / 2

  let sx: number, sy: number, ex: number, ey: number

  if (cCx >= pCx) {
    // child справа от parent
    sx = parent.x + parent.w
    sy = parent.y + parent.h / 2
    ex = child.x
    ey = child.y + child.h / 2
  } else {
    // child слева от parent
    sx = parent.x
    sy = parent.y + parent.h / 2
    ex = child.x + child.w
    ey = child.y + child.h / 2
  }

  // Контрольные точки кубической кривой — на половине расстояния по X
  const dx = (ex - sx) / 2
  const c1x = sx + dx
  const c1y = sy
  const c2x = ex - dx
  const c2y = ey

  return `M ${sx} ${sy} C ${c1x} ${c1y} ${c2x} ${c2y} ${ex} ${ey}`
}