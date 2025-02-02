import $, { type Cash } from 'cash-dom'

export default class CanvasBounds {
  private $canvas: Cash
  private minX: number = Infinity
  private minY: number = Infinity
  private maxX: number = -Infinity
  private maxY: number = -Infinity

  constructor( $canvas: Cash ){
    this.$canvas = $canvas
  }

  // Update bounds based on an element's position and dimensions
  update( element: Cash | HTMLElement ): void {
    const _element = element instanceof HTMLElement ? element : element[0]
    if( !_element ) return

    const 
    top: number = _element.offsetTop,
    left: number = _element.offsetLeft,
    right: number = left + _element.offsetWidth,
    bottom: number = top + _element.offsetHeight

    this.minY = Math.min( this.minY, top )
    this.minX = Math.min( this.minX, left )
    this.maxX = Math.max( this.maxX, right )
    this.maxY = Math.max( this.maxY, bottom )
  }

  // Recalculate virtual bounds by examining all absolute positioned elements
  refresh(){
    // Get all absolutely positioned elements in the canvas
    const elements = this.$canvas.find('*')
                                  .filter( function( this: HTMLElement ){ 
                                    return $(this).css('position') === 'absolute'
                                  })

    // Update bounds with each element
    elements.each( ( _, element: HTMLElement) => this.update( $(element) ) )

    return this
  }

  // Get the virtual width and height
  get width(): number {
    return this.maxX - this.minX
  }

  get height(): number {
    return this.maxY - this.minY
  }

  // Get the center point of the bounds
  get centerX(): number {
    return this.minX + (this.width / 2)
  }

  get centerY(): number {
    return this.minY + (this.height / 2)
  }
}
