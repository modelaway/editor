import type Editor from '../editor'
import type { Cash } from 'cash-dom'
import type { Component } from '../../lips/lips'
import type { FrameOption } from '../../types/frame'

import { EDITOR_EDGE_PADDING } from '../constants'
import Layers, { LayersInput } from '../../factory/layers'
import Toolbar, { ToolbarInput } from '../../factory/toolbar'
import Quickset, { QuicksetInput } from '../../factory/quickset'
import Movable, { type MovableOptions } from './movable'
import Sortable, { type SortableOptions } from './sortable'
import { 
  EDITOR_CONTROL_OPTIONS,
  GLOBAL_TOOLAR_OPTIONS
} from '../constants'

export default class Controls {
  private editor: Editor
  private layers?: Component<LayersInput, any, any, any>
  private toolbar?: Component<ToolbarInput, any>
  private quickset?: Component<QuicksetInput, any>

  constructor( editor: Editor ){
    this.editor = editor
  }

  /**
   * Update global controls options by settings
   * and preferences.
   */
  private getOptions(): Record<string, QuicksetOption> {

    if( this.editor.settings.viewLayers )
      EDITOR_CONTROL_OPTIONS.layers.active = true

    return EDITOR_CONTROL_OPTIONS
  }

  private actions( context: 'quickset' | 'toolbar' | 'layers' ){
    return ( key: string, option: QuicksetOption ) => {
      console.log(`${context} controls --`, key, option )

      switch( key ){
        case 'layers': {
          if( !option.active ){
            this.editor.lips.setContext('viewLayers', true )
            this.quickset?.subInput({ [`options.${key}.active`]: true })
          }
          else {
            this.editor.lips.setContext('viewLayers', false )
            this.quickset?.subInput({ [`options.${key}.active`]: false })
          }
        } break

        case 'addframe': {
          if( !option.value ) return

          const
          options: FrameOption = {
            device: option.value.device,
            size: {
              width: option.value.width,
              height: option.value.height
            },
            rounded: option.value.rounded,
            transparent: option.value.transparent
          },
          adaptability: FrameBasedCanvasAdaptability = {
            autopan: true
          },
          frame = this.editor.canvas.addFrame( options, adaptability )

          // TODO: 
          
        } break
      }
    }
  }

  enable(){
    if( !this.editor.$shell ) return

    const { $shell, settings, lips, events, store, history } = this.editor

    /**----------------------------------------------------
     * Initialize global toolbar
     * ----------------------------------------------------
     */
    const tinput: ToolbarInput = {
      key: 'global',
      tools: store.tools.getOptions(),
      views: store.views.getOptions(),
      globals: GLOBAL_TOOLAR_OPTIONS,
      // options: this.getOptions(),
      settings: {
        visible: settings.viewToolbar,
      }
    }
    
    this.toolbar = Toolbar( lips, tinput, { events, editor: this.editor })
    this.toolbar.appendTo( $shell )

    events.on('toolbar.handle', this.actions('toolbar') )
    
    /**----------------------------------------------------
     * Initialize global controls
     * ----------------------------------------------------
     */
    const cinput: QuicksetInput = {
      key: 'global',
      options: this.getOptions(),
      settings: {
        visible: settings.viewQuickSet,
      }
    }

    this.quickset = Quickset( lips, cinput, { events, editor: this.editor })
    this.quickset.appendTo( $shell )

    events.on('quickset.handle', this.actions('quickset') )
    
    /**----------------------------------------------------
     * Initialize frame layers control
     * ----------------------------------------------------
     */
    const linput: LayersInput = {
      host: {
        key: 'global',
        type: 'frame',
        title: 'Home',
        content: `
          <div class="alert">
            <p>Some text here</p>
          </div>
          <section class="header-block">
            <div class="container-fluid">
              <div class="row">
                <div class="col-xl-4 col-lg-4 col-md-4 logo">
                  <a href="/" title="Angular, React, Sass"><img src="https://www.webrecto.com/common/images/logo.png"
                      alt="Angular, React, Sass" title="Angular, React, Sass" /></a>
                </div>
                <div class="col-xl-8 col-lg-8 col-md-8 text-right">
                  <div class="header-menu">
                    <ul>
                      <li>Angular</li>
                      <li>React</li>
                      <li>NextJs</li>
                      <li>Sass</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>
        `
      },
      settings: {
        visible: settings.viewLayers,
        reduced: false
      }
    }
    
    this.layers = Layers( lips, linput, { events, editor: this.editor })
    this.layers.appendTo( $shell )

    events.on('layers.handle', this.actions('layers') )

    /**----------------------------------------------------
     * History stack record visual state
     * ----------------------------------------------------
     */
    history.on('history.record', ({ canRedo, canUndo }) => this.quickset?.subInput({
      'options.undo.disabled': !canUndo,
      'options.redo.disabled': !canRedo
    }))
  }

  disable(){
    this.editor.events.removeAllListeners()
    this.editor.history.removeAllListeners()

    this.layers = undefined
    this.toolbar = undefined
    this.quickset = undefined
  }

  /**
   * 
   */
  letPosition( $block: Cash, indication: string ): Position {
    if( !this.editor.$shell?.length )
      throw new Error('Undefined editor viewport')

    const
    $shell = this.editor.$shell,
    [ posX, posY ] = indication.split('-'),
    position: Position = {}

    if( !posY )
      throw new Error('Invalid positioning indication')

    function sidePosition( pos: string ){
      switch( pos ){
        case 'top':
        case 'left':
        case 'right':
        case 'bottom': position[ pos as keyof Position ] = `${EDITOR_EDGE_PADDING}px`; break
      }
    }
    function centerPosition( pos: string ){
      switch( pos ){
        case 'top':
        case 'bottom': position.left = `${($shell.width() / 2) - ($block.width() / 2)}px`; break
        case 'left':
        case 'right': position.top = `${($shell.height() / 2) - ($block.height() / 2)}px`; break
      }
    }

    if( posX == 'center' ){
      centerPosition( posY )
      sidePosition( posY )
    }
    else if( posY == 'center' ){
      centerPosition( posX )
      sidePosition( posX )
    }
    else {
      sidePosition( posX )
      sidePosition( posY )
    }

    /**
     * TODO: Add support for smart repositionning when 
     * indicated position is already take by another 
     * block to avoid overlapping
     */

    return position
  }

  /**
   * 
   */
  movable<Input = void, State = void, Static = void, Context = void>( component: Component<Input, State, Static, Context>, options?: MovableOptions ){
    return new Movable<Input, State, Static, Context>( this.editor, component, options )
  }

  /**
   * 
   */
  sortable<Input = void, State = void, Static = void, Context = void>( component: Component<Input, State, Static, Context>, options: SortableOptions ){
    return new Sortable<Input, State, Static, Context>( this.editor, component, options )
  }
}