// src/utils/injectStrict.ts
import { inject, type InjectionKey } from 'vue'

/**
 * Строгая версия inject: бросает ошибку, если провайдер не найден.
 *
 * Используется вместо inject(key, defaultValue) в случаях, когда
 * отсутствие провайдера — это баг архитектуры, а не штатная ситуация.
 *
 * Возвращаемый тип гарантированно T (без undefined), что избавляет
 * от необходимости писать `mindmap?.something` по всему коду.
 *
 * @example
 *   // В провайдере:
 *   provide(mindMapKey, mindmapApi)
 *
 *   // В потребителе:
 *   const mindmap = injectStrict(mindMapKey)
 *   mindmap.updateText(id, text)  // ← без ?., TS знает что не null
 */
export function injectStrict<T>(key: InjectionKey<T> | string): T {
  const value = inject(key)

  if (value === undefined) {
    const keyName = typeof key === 'symbol'
      ? key.description ?? 'unknown'
      : String(key)

    throw new Error(
      `[injectStrict] No provider found for key "${keyName}". ` +
      `Make sure a parent component calls provide(${keyName}, ...).`
    )
  }

  return value
}