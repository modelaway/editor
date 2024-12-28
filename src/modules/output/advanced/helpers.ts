import { BrowserInfo, detectBrowser } from './browser-utils'

export class LayoutError extends Error {
  constructor( message: string, public code: string ) {
    super( message )
    this.name = 'LayoutError'
  }
}

export class LayoutHelpers {
  static calculateRelationshipStrength(
    el1: UIElement,
    el2: UIElement
  ): number {
    const styleMatch = this.compareStyles( el1.style, el2.style )
    const spatialRelation = this.calculateSpatialRelation( el1, el2 )
    const semanticRelation = this.calculateSemanticRelation( el1, el2 )
    
    return ( styleMatch + spatialRelation + semanticRelation ) / 3
  }

  static compareStyles(
    style1: CSSProperties,
    style2: CSSProperties
  ): number {
    const properties = new Set([
      ...Object.keys( style1 ),
      ...Object.keys( style2 )
    ])

    let matches = 0
    properties.forEach( prop => {
      if( style1[ prop ] === style2[ prop ] )
        matches++
    })

    return matches / properties.size
  }

  static calculateSpatialRelation(
    el1: UIElement,
    el2: UIElement
  ): number {
    const distance = this.calculateDistance( el1.bounds, el2.bounds )
    const maxDistance = Math.sqrt(
      Math.pow( window.innerWidth, 2 ) +
      Math.pow( window.innerHeight, 2 )
    )
    
    return 1 - ( distance / maxDistance )
  }

  static calculateSemanticRelation(
    el1: UIElement,
    el2: UIElement
  ): number {
    let score = 0

    if( el1.type === el2.type )
      score += 0.5

    if( el1.metadata?.semanticType === el2.metadata?.semanticType )
      score += 0.5

    return score
  }

  static calculateDistance( b1: Bounds, b2: Bounds ): number {
    const center1 = {
      x: b1.left + b1.width / 2,
      y: b1.top + b1.height / 2
    }
    
    const center2 = {
      x: b2.left + b2.width / 2,
      y: b2.top + b2.height / 2
    }

    return Math.sqrt(
      Math.pow( center2.x - center1.x, 2 ) +
      Math.pow( center2.y - center1.y, 2 )
    )
  }
}

export class StyleHelpers {
  static generateColorName( color: string ): string {
    // Convert hex to RGB for better naming
    const rgb = this.hexToRgb( color )
    if( !rgb ) return 'unknown'

    const hsl = this.rgbToHsl( rgb.r, rgb.g, rgb.b )
    return this.generateColorNameFromHSL( hsl )
  }

  static hexToRgb( hex: string ): { r: number, g: number, b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec( hex )
    
    return result ? {
      r: parseInt( result[1], 16 ),
      g: parseInt( result[2], 16 ),
      b: parseInt( result[3], 16 )
    } : null
  }

  static rgbToHsl( r: number, g: number, b: number ): [number, number, number] {
    r /= 255
    g /= 255
    b /= 255

    const max = Math.max( r, g, b )
    const min = Math.min( r, g, b )
    let h: number = 0
    let s: number
    const l = ( max + min ) / 2

    if( max === min ) {
      h = s = 0
    } else {
      const d = max - min
      s = l > 0.5 ? d / ( 2 - max - min ) : d / ( max + min )
      
      switch( max ) {
        case r: h = ( g - b ) / d + ( g < b ? 6 : 0 ); break
        case g: h = ( b - r ) / d + 2; break
        case b: h = ( r - g ) / d + 4; break
      }
      
      h /= 6
    }

    return [h, s, l]
  }

  static generateColorNameFromHSL( 
    [h, s, l]: [number, number, number] 
  ): string {
    let name = ''
    
    // Lightness modifiers
    if( l < 0.2 ) name = 'dark-'
    else if( l > 0.8 ) name = 'light-'
    
    // Saturation modifiers
    if( s < 0.2 ) return name + 'gray'
    
    // Hue bands
    const hue = h * 360
    if( hue < 30 ) return name + 'red'
    if( hue < 60 ) return name + 'orange'
    if( hue < 90 ) return name + 'yellow'
    if( hue < 150 ) return name + 'green'
    if( hue < 210 ) return name + 'cyan'
    if( hue < 270 ) return name + 'blue'
    if( hue < 330 ) return name + 'purple'
    return name + 'red'
  }
}

export class ValidationHelpers {
  static validateLayout(
    layout: OptimizedLayout,
    config: LayoutConfig
  ): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Validate container
    this.validateContainer( layout.container, errors, warnings )

    // Validate children
    layout.children.forEach( child =>
      this.validateChild( child, layout.container, errors, warnings )
    )

    // Validate custom properties
    this.validateCustomProperties( 
      layout.customProperties,
      errors,
      warnings
    )

    // Check browser support
    this.validateBrowserSupport( layout, config, warnings )

    return { errors, warnings }
  }

  static validateContainer(
    container: ContainerStyles,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if( !container.display )
      errors.push({
        code: 'CONTAINER_NO_DISPLAY',
        message: 'Container must have display property'
      })

    if( container.position === 'fixed' )
      warnings.push({
        code: 'CONTAINER_FIXED_POSITION',
        message: 'Fixed position may cause issues on mobile devices'
      })
  }

  static validateChild(
    child: OptimizedElement,
    container: ContainerStyles,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if( !child.id )
      errors.push({
        code: 'CHILD_NO_ID',
        message: 'Child element must have an ID'
      })

    if( child.styles.position === 'absolute' && 
        container.position !== 'relative' )
      warnings.push({
        code: 'CHILD_ABSOLUTE_NO_RELATIVE_PARENT',
        message: 'Absolute positioned child without relative parent'
      })
  }

  static validateCustomProperties(
    properties: CSSCustomProperties,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const tokenNames = new Set<string>()

    properties.tokens.forEach( token => {
      if( tokenNames.has( token.name ) )
        errors.push({
          code: 'DUPLICATE_TOKEN',
          message: `Duplicate token name: ${token.name}`
        })

      tokenNames.add( token.name )

      if( !token.value )
        errors.push({
          code: 'TOKEN_NO_VALUE',
          message: `Token ${token.name} has no value`
        })
    })
  }

  static validateBrowserSupport(
    layout: OptimizedLayout,
    config: LayoutConfig,
    warnings: ValidationWarning[]
  ): void {
    const browserInfo = detectBrowser()
    const minVersion = config.browserSupport.minVersion[ browserInfo.name ]

    if( minVersion && browserInfo.version < minVersion )
      warnings.push({
        code: 'BROWSER_VERSION',
        message: `Current browser version ${browserInfo.version} is below minimum supported version ${minVersion}`
      })
  }
}

export class PerformanceHelpers {
  static measureExecutionTime(
    fn: () => void,
    iterations: number = 1
  ): number {
    const times: number[] = []
    
    for(let i = 0; i < iterations; i++) {
      const start = performance.now()
      fn()
      times.push(performance.now() - start)
    }

    return times.reduce((a, b) => a + b) / times.length
  }

  static estimateMemoryUsage(elements: UIElement[]): number {
    let size = 0
    
    elements.forEach(element => {
      size += JSON.stringify(element).length * 2 // UTF-16 encoding
      size += Object.keys(element.style).length * 32 // Style property overhead
    })

    return size
  }

  static optimizeReflows(elements: UIElement[]): UIElement[] {
    const batches = this.batchDOMOperations(elements)
    return this.applyContainment(batches)
  }

  private static batchDOMOperations(
    elements: UIElement[]
  ): UIElement[][] {
    const batches: UIElement[][] = [[]]
    let currentBatchSize = 0
    
    elements.forEach(element => {
      if(currentBatchSize >= 10) {
        batches.push([])
        currentBatchSize = 0
      }
      batches[batches.length - 1].push(element)
      currentBatchSize++
    })

    return batches
  }

  private static applyContainment(
    batches: UIElement[][]
  ): UIElement[] {
    return batches.flat().map(element => ({
      ...element,
      style: {
        ...element.style,
        contain: 'layout style paint'
      }
    }))
  }
}

export class AccessibilityHelpers {
  static validateAccessibility(
    element: UIElement
  ): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = []

    if(!element.accessibility?.role) {
      violations.push({
        rule: 'aria-role',
        elements: [element.id],
        impact: 'serious'
      })
    }

    if(this.needsLabel(element) && !element.accessibility?.label) {
      violations.push({
        rule: 'aria-label',
        elements: [element.id],
        impact: 'critical'
      })
    }

    return violations
  }

  private static needsLabel(element: UIElement): boolean {
    const interactiveRoles = ['button', 'link', 'textbox', 'checkbox']
    return interactiveRoles.includes(element.accessibility?.role || '')
  }

  static generateA11yTree(elements: UIElement[]): A11yNode[] {
    return elements.map(element => ({
      role: element.accessibility?.role || 'generic',
      name: element.accessibility?.label || '',
      children: element.children 
        ? this.generateA11yTree(element.children)
        : []
    }))
  }
}

interface A11yNode {
  role: string
  name: string
  children: A11yNode[]
}