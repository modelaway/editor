import $ from 'cash-dom'
import { ELEMENT_KEY_SELECTOR } from './constants'

export default class Traverser {
  private layerCount: number = 0
  private zIndex: number = 0

  private FLAGS  = [
    'rzwrapper:selected',
    'scope'
  ]

  /**
   * Generate unique key for layer elements
   */
  private generateAttributes(){
    this.layerCount++

    return {
      defkey: `l${this.layerCount}`,
      defname: `Layer ${this.layerCount}`
    }
  }

  private ignoreFlag( element: Element, flag?: string ): { element: Element, flag?: string } | null {
    for( const tagname of this.FLAGS  ){
      const [ name, flag ] = tagname.split(':') || []
      if( !name ) return { element }

      if( name.toUpperCase() === element.tagName ){
        const firstchild = element.firstChild as Element
        return firstchild && flag !== '*' ? this.ignoreFlag( firstchild, flag ) : null
      }
    }
    
    return { element, flag }
  }
  /**
   * Get element type based on its structure
   */
  private getElementType( element: Element ): LayerElement['type'] {
    const tagName = (element.tagName || '').toLowerCase()

    if( tagName )
      switch( tagName ){
        case 'img': return 'image'
        case 'video': 
        case 'audio': return tagName
        default: return 'block'
      }

    else return 'text'
  }
  /**
   * Create layer element with its properties
   */
  private createDelta( element: Element, parentKey?: string, flag?: string ): LayerElement {
    const 
    $element = $(element)
    if( !$element.length )
      throw new Error('Invalid element')

    const
    { defkey, defname } = this.generateAttributes(),
    type = this.getElementType( element ),
    groupAttr = $element.attr('group'),
    children = type !== 'text' ? $element.children() : null,
    layer: Delta = {
      key: $element.attr( ELEMENT_KEY_SELECTOR ) || defkey,
      parentKey,
      name: $element.attr( ELEMENT_KEY_SELECTOR ) || defname,
      tagname: type === 'text' ? 'text' : element.tagName.toLowerCase(),
      type,
      category: groupAttr ? 'group' : ( children && children.length > 0 ? 'node' : 'element' ),
      attributes: {},
      position: {
        x: type !== 'text' && $element.offset()?.left || 0,
        y: type !== 'text' && $element.offset()?.top || 0,
        z: this.zIndex++
      },
      hidden: !!$element.attr('hidden'),
      locked: !!$element.attr('locked'),
      styles: $element.attr('style-ref')
    }

    // const componentName = $element.attr('data-component')
    // const componentRel = $element.attr('data-component-rel')
    // if( componentName && componentRel ){
    //   delta.component = {
    //     name: componentName,
    //     rel: componentRel
    //   }
    // }

    if( layer.category === 'node' || layer.category === 'group' )
      children?.each(( _, child: Element ) => {
        const result = this.ignoreFlag( child )
        if( !result || !result.element ) return

        child = result.element

        const childLayer = this.createDelta( child, layer.key, result.flag )
        if( layer.content instanceof Map ){
          if( !layer.content )
            layer.content = new Map()

          layer.content.set( childLayer.key, childLayer )
        }
      })

    return layer
  }

  /**
   * Traverse DOM structure and build layer tree
   */
  public traverse( rootElement: string | Element ): Map<string, LayerElement> {
    const 
    $root = $(rootElement),
    layers: Map<string, LayerElement> = new Map()
    
    $root.each(( _, element: Element ) => {
      const result = this.ignoreFlag( element )
      if( !result || !result.element ) return

      element = result.element

      const layer = this.createDelta( element, undefined, result.flag )
      layers.set( layer.key, layer )
    })

    return layers
  }

  /**
   * Find all layers belonging to specific group
   */
  public findLayersByGroup( layers: Map<string, LayerElement>, groupName: string ): LayerElement[] {
    const result: LayerElement[] = []
    
    Object
    .entries( layers )
    .forEach( ([ key, layer ]) => {
      if( layer.attribute === 'group' && layer.name === groupName )
        result.push( layer )
      
      if( layer.layers )
        result.push( ...this.findLayersByGroup( layer.layers, groupName ))
    })
    
    return result
  }
}