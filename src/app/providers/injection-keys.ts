// src/types/injection-keys.ts
import type { InjectionKey } from 'vue'
import type { MindMapApi } from '../../types/mindmap-api'

export type NotifyColor = 'success' | 'error' | 'info' | 'warning'

export type NotifyFn = (
  text: string,
  color?: NotifyColor,
  icon?: string
) => void

export const mindMapKey: InjectionKey<MindMapApi> = Symbol('mindmap')
export const notifyKey: InjectionKey<NotifyFn> = Symbol('notify')