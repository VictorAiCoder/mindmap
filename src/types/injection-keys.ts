// src/types/injection-keys.ts
import type { InjectionKey } from 'vue'
import type { MindMapApi } from './mindmap-api'

export const MindMapKey: InjectionKey<MindMapApi> = Symbol('mindmap')

/** Функция уведомлений */
export type NotificationType = 'success' | 'error' | 'info' | 'warning'

export interface NotifyFn {
  (message: string, type?: NotificationType, icon?: string): void
}

export const NotifyKey: InjectionKey<NotifyFn> = Symbol('notify')