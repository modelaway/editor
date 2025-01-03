import type Editor from '../modules/editor'

export interface HandlerHook {
  editor?: Editor
  events?: EventEmitter
  metacall?: ( key: string, data?: any ) => void
}

export type MovableEffect = ( block: Cash, event: 'started' | 'moving' | 'stopped', position: Position ) => void
export type MovableOptions = {
  $handle?: Cash
  apex: ('top' | 'left' | 'right' | 'bottom')[]
}