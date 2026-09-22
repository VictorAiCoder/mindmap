// embed/types/node-command.ts

/**
 * Discriminated union для всех команд, которые MapNode может отправить в MindMapCanvas.
 *
 * Заменяет 16 отдельных emit'ов на один @command с типизированным payload.
 * MindMapCanvas обрабатывает через switch(cmd.type).
 *
 * @example
 * ```vue
 * <!-- MapNode -->
 * <MapNode @command="(cmd) => handleCommand(cmd, pos)" />
 *
 * <!-- MindMapCanvas -->
 * function handleCommand(cmd: NodeCommand, pos: LayoutPosition) {
 *   switch (cmd.type) {
 *     case 'addChild': handleAddChild(pos.id); break
 *     case 'delete': nodeOps.handleDelete(pos.id); break
 *     // ...
 *   }
 * }
 * ```
 */
export type NodeCommand =
  | { type: 'edit' }
  | { type: 'addChild' }
  | { type: 'delete' }
  | { type: 'toggle' }
  | { type: 'resetPosition' }
  | { type: 'startDrag'; event: MouseEvent }
  | { type: 'setImage'; dataUrl: string }
  | { type: 'setImageById'; imageId: string }
  | { type: 'removeImage' }
  | { type: 'resizeImage'; width: number }
  | { type: 'resizeImageCommit'; width: number }
  | { type: 'openNotes' }
  | { type: 'toggleNotePin' }
  | { type: 'toggleNotesVisible' }
  | { type: 'focusNode' }
  | { type: 'editSegments'; nodeId: string }

/** Тип emit-функции для команд. */
export type CommandEmitter = (cmd: NodeCommand) => void
