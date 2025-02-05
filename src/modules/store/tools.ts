import type Editor from '../editor'
import type { ViewDefinition } from '../../types/view'

export default class ToolStore {
  private list: Record<string, ViewDefinition> = {}

  constructor({ settings }: Editor ){
    /**
     * General settings inherited from Modela
     */
    // this.settings = settings
  }

  getOptions(): Record<string, ToolbarOption> {
    const options = {
      POINTER: {
        icon: 'bx bx-pointer',
        title: 'Pointer',
        active: true
      },
      PICKER: {
        icon: 'bx bxs-eyedropper',
        title: 'Picker'
      },
      PENCIL: {
        title: 'Pencil',
        selected: 'pen',
        variants: {
          '*': {
            icon: 'bx bx-pencil',
            title: 'Pencil',
            parent: 'PENCIL'
          },
          'pen': {
            icon: 'bx bx-pen',
            title: 'Pen',
            parent: 'PENCIL'
          }
        }
      },
      TRANSFORM: {
        icon: 'bx bx-rotate-left',
        title: 'Transform',
        instructions: 'Apply super transformation like skew, rotate, scale, translate, ... to an element'
      },
      VECTOR: {
        icon: 'bx bx-vector',
        title: 'Vector'
      },
      FLOW: {
        icon: 'bx bx-git-merge',
        title: 'Flow',
        disabled: true
      }
    }

    return options
  }

  clear(){
    this.list = {}
  }
}
