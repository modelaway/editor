import type Modela from '../exports/modela'
import type { FrameOption } from '../types/frame'

import EventEmitter from 'events'
import CSS from './css'
import Views from './views'
import History from './history'
import IOF from '../lib/custom.iframe.io'
import { debug, generateKey } from './utils'
import {
  MEDIA_SCREENS,
  CONTROL_EDGE_MARGIN,
  CONTROL_PANEL_SELECTOR,
  VIEW_IDENTIFIER,
  VIEW_REF_SELECTOR,
  VIEW_KEY_SELECTOR,
  PATCH_CSS_SETTINGS,
  VIEW_ACTIVE_SELECTOR,
  VIEW_ALLEY_SELECTOR,
  CONTROL_SNAP_THRESHOLD,
  CONTROL_FRAME_SELECTOR
} from './constants'
import FrameWindow, { FrameWindowRemote, FrameWindowDOM, FrameQuery } from '../lib/frame.window'

const createFrame = ( key: string, options: FrameOption ) => {
  /**
   * User `srcdoc` to inject default HTML skeleton
   * into the iframe if `option.source` isn't provided.
   */
  const source = options.content ?
                      `src="${URL.createObjectURL( new Blob([ options.content ], { type: 'text/html' }) )}"`
                      : `src="${options.source}"`

  return `<mframe ${CONTROL_FRAME_SELECTOR}="${key}" style="top:${options.position?.top || '0px'};left:${options.position?.left || '0px'}">
    <mul>
      <mli action="frame.delete"><micon class="bx bx-trash"></micon></mli>
    </mul>

    <mblock>
      <iframe ${source}
              title="${options.title || `Frame ${key}`}"
              importance="high"
              referrerpolicy="origin"
              sandbox="allow-scripts allow-same-origin"></iframe>
    </mblock>
    <moverlap action="frame.focus" on></moverlap>
  </mframe>`
}

export default class Frame extends EventEmitter {
  private chn?: IOF
  public key: string
  public flux: Modela
  public active = false
  public $frame: JQuery<HTMLElement>

  public remote?: FrameWindowRemote
  public $$?: FrameWindowDOM

  public $$root?: FrameQuery
  public $$head?: FrameQuery
  public $$body?: FrameQuery
  
  /**
   * Initialize history manager
   */
  public history = new History()

  /**
   * Initialize global css manager
   */
  public css = new CSS( this )

  /**
   * Initialize views manager
   */
  public views = new Views( this )

  constructor( flux: Modela, options: FrameOption ){
    super()
    this.flux = flux

    // Generate new key for the new frame
    this.key = generateKey()
    this.$frame = $(createFrame( this.key, options ))

    this.$frame.find('iframe').on('load', ( e: Event ) => {
      const target = e.target as HTMLIFrameElement
      if( !target )
        throw new Error('Unexpected error occured')

      this.chn = new IOF({ type: 'WINDOW' })
      this.chn.initiate( target.contentWindow as Window, new URL( options.source || window.location.href ).origin )

      // Remove all existings listeners when iframe get reloaded
      this.chn.removeListeners()
      // Synchronize once iof connection established
      this.chn.once('connect', this.sync.bind(this) )
    })

    // Use default frame screen resolution
    this.resize( options.device || 'default')
    // Add frame to the board
    flux.workspace.$canvas?.append( this.$frame )
    
    /**
     * Emit new frame added to the board
     * 
     * Caution: `add` event doesn't mean the frame is loaded
     *          To perform operation on a loaded frame, listen
     *          to `load` event instead.
     */
    this.emit('add')
  }

  private sync(){
    if( !this.chn ) return
    /**
     * Initialize access to remote frame window & document
     * functionalities.
     */
    const { DOM, remote } = FrameWindow( this.chn )
    
    this.$$ = DOM
    this.remote = remote

    // Bind with remove client and initialize controls
    this.chn.emit('bind', { key: this.key, settings: this.flux.settings }, this.controls.bind(this) )
  }
  private async controls(){
    if( !this.$$ ) return

    // Defined main document layout
    this.$$root = await this.$$('html')
    this.$$head = await this.$$('head')
    this.$$body = await this.$$('body')

    // Define initial :root css variables (Custom properties)
    this.css.setVariables()
    // Inject modela css patch into frame content <head>
    this.css.declare('patch', PATCH_CSS_SETTINGS )

    /**
     * Propagate view control over the existing content
     */
    this.$$body
    && this.flux.settings.autoPropagate
    && await this.views.propagate( this.$$body )

    // Activate all inert add-view alleys
    this.enableAlleys('active')
    
    // Set initial content as first history stack
    const initialContent = await this.$$root.html()
    initialContent && this.history.initialize( initialContent )

    // Initialize control events
    this.events()
    /**
     * Enable draggable features frame
     * 
     * - Move frame
     * - Snap guidance
     */
    this.draggable()

    // Frame fully loaded
    this.emit('load')
  }

  enable(){
    this.$frame.find('> moverlap').removeAttr('on')
  }
  disable(){
    this.$frame.find('> moverlap').attr('on', 'true')
  }

  events(){
    if( !this.$$body?.length || !this.flux.$modela?.length ) return

    /**
     * Listen to View components or any editable tag
     */
    const selectors = `${this.flux.settings.viewOnly ? VIEW_IDENTIFIER : ''}:not([${VIEW_ALLEY_SELECTOR}],[${CONTROL_PANEL_SELECTOR}] *)`
    this.flux.settings.hoverSelect ?
              this.$$body.on('mouseover', selectors, this.views.lookup.bind( this.views ) )
              : this.$$body.on('click', selectors, this.views.lookup.bind( this.views ) )

    this.$$body
    /**
     * Show toolbar options
     */
    .on('click', `[${VIEW_ACTIVE_SELECTOR}]`, async ( $$this: FrameQuery ) => {
      if( !this.active ) return

      const key = await $$this.attr( VIEW_KEY_SELECTOR )
      debug('toolbar event --', key )

      if( !key ) return

      // Show toolbar
      const view = this.views.get( key )
      view?.showToolbar()
    } )

    /**
     * Show floating triggers on alley hover
     */
    .on('mouseover', `[${VIEW_ALLEY_SELECTOR}]`, async ( $$this: FrameQuery ) => {
      if( !this.active ) return
      
      const key = await $$this.attr( VIEW_REF_SELECTOR )
      debug('floating event --', key )

      if( !key ) return

      // Show floating
      const view = this.views.get( key )
      view?.showFloating()
    } )

    .on('input', '[contenteditable]', async () => await this.pushHistoryStack( true ) )
    // .on('keydown', onUserAction )
    // .on('paste', onUserAction )
  }

  /**
   * Enable frame drag on adjustment grid
   */
  draggable(){
    const self = this
    let
    startX: number,
    startY: number,
    startLeft: number,
    startTop: number,
    $target: JQuery | undefined

    // Mouse down: Start dragging
    this.$frame.find('moverlap')
    .on('mousedown', function( e: any ){
      self.flux.workspace.isDragging = true
      $target = $(this).closest(`mframe[${CONTROL_FRAME_SELECTOR}="${self.key}"]`)

      // Store starting positions
      startX = e.pageX
      startY = e.pageY
      startLeft = parseFloat( $target.css('left') )
      startTop = parseFloat( $target.css('top') )

      // Prevent iframe interaction
      e.preventDefault()
    })

    $(document)
    // Mouse up: Stop dragging
    .on('mouseup', () => {
      if( this.flux.workspace.isDragging ){
        this.flux.workspace.isDragging = false

        // Hide snap guides
        this.flux.workspace.$vsnapguide?.hide()
        this.flux.workspace.$hsnapguide?.hide()
      }

      $target = undefined
    })
    // Mouse move: Handle dragging and snapping
    .on('mousemove', ( e: any ) => {
      if( this.flux.workspace.isDragging
          && $target?.length
          && $target.is(`mframe[${CONTROL_FRAME_SELECTOR}="${this.key}"]`)
          && this.flux.workspace.$vsnapguide?.length
          && this.flux.workspace.$hsnapguide?.length ){
        const
        frameWidth = $target.width() as number,
        frameHeight = $target.height() as number,

        scaleQuo = 1 / this.flux.workspace.scale,

        deltaX = ( e.pageX - startX ) * scaleQuo,
        deltaY = ( e.pageY - startY ) * scaleQuo

        if( Number.isNaN( deltaX ) || Number.isNaN( deltaY ) ) return

        let
        newLeft = startLeft + deltaX,
        newTop = startTop + deltaY,
        newRight = newLeft + frameWidth,
        newBottom = newTop + frameHeight,

        // Check alignment with other elements
        closestLeft = null,
        closestTop = null,
        closestRight = null,
        closestBottom = null,

        hsnapTop = 0,
        vsnapLeft = 0

        $('mframe').not($target).each(function(){
          const
          $other = $(this),
          otherLeft = parseFloat( $other.css('left') ),
          otherTop = parseFloat( $other.css('top') ),
          otherRight = otherLeft + ($other.width() as number),
          otherBottom = otherTop + ($other.height() as number),

          otherRect = $other[0].getBoundingClientRect()

          // Snap to other elements' left and right edges
          if( Math.abs( newLeft - otherLeft ) < CONTROL_SNAP_THRESHOLD ){
            closestLeft = otherLeft
            vsnapLeft = otherRect.left
          }
          if( Math.abs( newLeft - otherRight ) < CONTROL_SNAP_THRESHOLD ){
            closestLeft = otherRight
            vsnapLeft = otherRect.right
          }
          if( Math.abs( newRight - otherLeft ) < CONTROL_SNAP_THRESHOLD ){
            closestRight = otherLeft
            vsnapLeft = otherRect.left
          }
          if( Math.abs( newRight - otherRight ) < CONTROL_SNAP_THRESHOLD ){
            closestRight = otherRight
            vsnapLeft = otherRect.right
          }

          // Snap to other elements' top and bottom edges
          if( Math.abs( newTop - otherTop ) < CONTROL_SNAP_THRESHOLD ){
            closestTop = otherTop
            hsnapTop = otherRect.top
          }
          if( Math.abs( newTop - otherBottom ) < CONTROL_SNAP_THRESHOLD ){
            closestTop = otherBottom
            hsnapTop = otherRect.bottom
          }
          if( Math.abs( newBottom - otherTop ) < CONTROL_SNAP_THRESHOLD ){
            closestBottom = otherTop
            hsnapTop = otherRect.top
          }
          if( Math.abs( newBottom - otherBottom ) < CONTROL_SNAP_THRESHOLD ){
            closestBottom = otherBottom
            hsnapTop = otherRect.bottom
          }
        })
        
        // Use closest alignment point or snap to grid
        if( closestLeft !== null ){
          newLeft = closestLeft

          this.flux.workspace.$vsnapguide
          .css({ left: `${vsnapLeft}px`, top: 0 })
          .show()
        }
        else if( closestRight !== null ){
          newLeft = closestRight - frameWidth

          this.flux.workspace.$vsnapguide
          .css({ left: `${vsnapLeft}px`, top: 0 })
          .show()
        }
        else this.flux.workspace.$vsnapguide.hide()

        if( closestTop !== null ){
          newTop = closestTop

          this.flux.workspace.$hsnapguide
          .css({ left: 0, top: `${hsnapTop}px` })
          .show()
        }
        else if( closestBottom !== null ){
          newTop = closestBottom - frameHeight

          this.flux.workspace.$hsnapguide
          .css({ left: 0, top: `${hsnapTop}px` })
          .show()
        }
        else this.flux.workspace.$hsnapguide.hide()
        
        $target.css({ left: `${newLeft}px`, top: `${newTop}px` })
      }
    })
  }
  resize( device: string ){
    if( device === 'default' ){
      const 
      screenWidth = $(window).width(),
      screenHeight = $(window).height()
      
      this.$frame.find('iframe').css({ width: `${screenWidth}px`, height: `${screenHeight}px` })

      this.emit('screen-mode.change', device )
      return
    }

    const mediaScrean = MEDIA_SCREENS[ device ] || Object.values( MEDIA_SCREENS ).filter( each => (each.device == device || each.type.id == device) )[0]
    if( !mediaScrean ) return

    const { width, height } = mediaScrean
    this.$frame.find('iframe').css({ width, height })

    this.emit('screen-mode.change', device )
  }
  delete(){
    // Disable add-view alleys
    this.enableAlleys('inert')

    // Clear views meta data
    this.views?.clear()
    // Remove frame element from the DOM
    this.$frame.remove()

    this.emit('frame.delete')
  }
  edit(){
    this.active = true

    this.$frame.attr('active', 'true')
    this.$frame.parent().attr('active', 'true')
  }
  dismiss(){
    this.active = false

    this.$frame.removeAttr('active')
    this.$frame.parent().removeAttr('active')
    
    this.emit('frame.dismiss')
  }

  /**
   * Set general state of alleys
   * 
   * - active: Enable add-view alleys highlighting during editing
   * - inert: Disable add-view alleys
   */
  enableAlleys( status = 'active' ){
    if( !this.flux.settings.enableAlleys ) return
    $(`[${VIEW_ALLEY_SELECTOR}]`).attr('status', status )
  }

  /**
   * Return an element dimension and position 
   * situation in the DOM
   */
  async getTopography( $elem: JQuery<HTMLElement> | FrameQuery ){
    if( !$elem.length || !this.$$ )
      throw new Error('Invalid method call. Expected a valid element')
    
    const
    defaultOffset = { left: CONTROL_EDGE_MARGIN, top: CONTROL_EDGE_MARGIN },
    frameOffset = this.$frame.find('iframe').offset() || defaultOffset

    /**
     * View position coordinates in the DOM base on
     * which related triggers will be positionned.
     */
    let { left, top } = await $elem.offset() || defaultOffset

    top += frameOffset.top
    left += frameOffset.left

    // Determite position of element relative to iframe window
    const $$window = await this.$$('window')
    top -= await $$window.scrollTop() || 0
    left -= await $$window.scrollLeft() || 0

    // Determite position of element relative to top window
    top -= $(window).scrollTop() || 0
    left -= $(window).scrollLeft() || 0

    return {
      x: left || CONTROL_EDGE_MARGIN,
      y: top || CONTROL_EDGE_MARGIN,
      width: await $elem.width() || 0,
      height: await $elem.height() || 0
    }
  }

  /**
   * Retrieve frame's body content.
   */
  async getContent( root = false ){
    return await (root ? this.$$root : this.$$body)?.html() || ''
  }
  /**
   * Set frame's body content
   */
  async setContent( content: string, root = false ){
    await (root ? this.$$root : this.$$body)?.html( content )
  }

  /**
   * Record/push current frame window content as
   * latest history stack.
   */
  async pushHistoryStack( TDR = false ){
    const currentContent = await this.getContent()
    if( currentContent === undefined ) return 
    
    TDR ? 
      // Throttling & Deboucing Recording
      this.history.lateRecord( currentContent )
      // No delay recording
      : this.history.record( currentContent )
  }
}