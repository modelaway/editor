import { compile, serialize, stringify, middleware } from 'stylis'
import { CSS_CUSTOM_VARIABLES } from '../constants'

interface StyleOptions {
  rel: string
  scope?: boolean
}

interface StyleMetadata {
  sheet: CSSStyleSheet
  isScoped: boolean
  rel?: string
}

interface ProcessedImports {
  cssText: string
  imports: string[]
}

export default class FrameStyle {
  private shadow: ShadowRoot
  private tempSheet: CSSStyleSheet

  /**
   * Storage of all stylesheets with metadata for extraction later
   */
  private sheets = {
    inline: new Map<string, StyleMetadata>(),   // rel: id, value: { sheet, isScoped, rel? }
    linked: new Map<string, StyleMetadata>(),   // rel: href, value: { sheet, isScoped, rel? }
    imported: new Map<string, StyleMetadata>()  // rel: importUrl, value: { sheet, isScoped, rel? }
  }

  constructor( shadow: ShadowRoot, metaStyle?: string ){
    this.shadow = shadow
    this.tempSheet = new CSSStyleSheet()

    /**
     * Constructable stylesheet for frame-level styles
     */
    metaStyle && this.addRules( metaStyle || '', { rel: 'frame' })
  }
  
  /**
   * Extract @import rules from CSS text and return 
   * processed content.
   */
  private async processCSS( sheet: string ): Promise<ProcessedImports> {
    /**
     * Process `scss` string to `css` string first
     */
    const cssText = await this.compile( sheet )
    if( !cssText ) throw new Error('Empty CSS sheet to compile')

    /**
     * Process all imports in a single replace operation
     */
    const
    imports: string[] = [],
    importRegex = /@import\s+(?:url\(['"]?([^'")]+)['"]?\)|['"]([^'"]+)['"]);?\n?/g
    
    const processedCss = cssText.replace( importRegex, ( _, urlMatch, quotedMatch ) => {
      imports.push( urlMatch || quotedMatch )
      return ''
    })

    return {
      cssText: processedCss.trim(),
      imports
    }
  }

  /**
   * Fetch and process CSS file including its @imports
   * with a cache and batch processing
   */
  private async fetchCSSContent( url: string ): Promise<string> {
    const
    self = this,
    seen = new Set<string>(),
    fetchCache = new Map<string, Promise<string>>()
    
    async function processCSSFile( cssUrl: string ): Promise<string> {
      if( seen.has( cssUrl ) ) return ''
      seen.add( cssUrl )

      // Check cache first
      if( fetchCache.has( cssUrl ) )
        return fetchCache.get( cssUrl )!

      const fetchPromise = ( async () => {
        const
        response = await fetch( cssUrl ),
        cssText = await response.text(),
        { imports, cssText: processedCss } = await self.processCSS( cssText )

        // Process all imports in parallel
        if( imports.length ){
          const
          importPromises = imports.map( importUrl => {
            const absoluteUrl = new URL( importUrl, cssUrl ).href
            return processCSSFile.call( self, absoluteUrl )
          }),
          importedCss = await Promise.all( importPromises )
          
          return importedCss.join('') + processedCss
        }
        
        return processedCss
      } )()

      fetchCache.set( cssUrl, fetchPromise )

      return fetchPromise
    }

    return processCSSFile.call( this, url )
  }

  /**
   * Helper to scope CSS rules to specific view
   * Optimized with single-pass rule processing
   */
  private toString( cssText: string, rel?: string ): string {
    const
    ruleParts: string[] = [],
    { cssRules }: any = ( this.tempSheet.replaceSync( cssText ), this.tempSheet )

    for( const rule of cssRules ){
      if( rule.type === CSSRule.STYLE_RULE ){
        // Prefix each selector with view id
        const scopedSelector = rule.selectorText
                                    .split(',')
                                    .map( ( selector: string ) => {
                                      const trimmed = selector.trim()
                                      
                                      return !rel 
                                              || trimmed.startsWith(':root')
                                              || trimmed.startsWith(':host')
                                                    ? trimmed
                                                    : `[rel="${rel}"] ${trimmed}`
                                    })
                                    .join(',')
                                    
        ruleParts.push(`${scopedSelector} ${rule.style.cssText}`)
      }
      else ruleParts.push( rule.cssText )
    }

    return ruleParts.join('\n')
  }

  /**
   * Process sheet string using Stylis
   */
  compile( str: string ): string {
    try { return serialize( compile( str ), middleware([ stringify ]) ) } 
    catch( error: any ){
      throw new Error(`Style compilation failed: ${error.message}`)
    }
  }

  async addRules( cssText: string, options: StyleOptions ){
    const { rel, scope = false } = options

    try {
      const
      { imports, cssText: processedCss } = await this.processCSS( cssText ),
      sheet = new CSSStyleSheet()
      
      // Handle main CSS
      if( processedCss ){
        await sheet.replace( scope ? this.toString( processedCss, rel ) : processedCss )
        
        // Avoid duplicate
        this.removeRules( rel )
        this.sheets.inline.set( rel, {
          sheet,
          isScoped: scope,
          rel
        })
        
        this.shadow.adoptedStyleSheets = [
          ...this.shadow.adoptedStyleSheets,
          sheet
        ]
      }

      // Handle @imports in parallel
      imports.length
      && await Promise.all( imports.map( importUrl => this.addImport( importUrl, { rel, scope }) ) )
    }
    catch( error: any ){
      console.error('Failed to add styles:', error )
      return false
    }

    return true
  }

  async addLink( href: string, options: StyleOptions ){
    const { rel, scope = false } = options
    
    try {
      const
      cssText = await this.fetchCSSContent( href ),
      sheet = new CSSStyleSheet()
      
      await sheet.replace( scope && rel ? this.toString( cssText, rel ) : cssText )
      
      // Avoid duplicate
      this.removeLink( href )
      this.sheets.linked.set( href, {
        sheet,
        isScoped: scope,
        rel
      })
      
      this.shadow.adoptedStyleSheets = [
        ...this.shadow.adoptedStyleSheets,
        sheet
      ]
      
      return true
    }
    catch( error: any ){
      console.error(`Failed to add linked stylesheet ${href}:`, error )
      return false
    }
  }

  async addImport( url: string, options: StyleOptions ){
    const { rel, scope = false } = options

    try {
      const
      cssText = await this.fetchCSSContent( url ),
      sheet = new CSSStyleSheet()
      
      await sheet.replace( scope && rel ? this.toString( cssText, rel ) : cssText )
      
      // Avoid duplicate
      this.removeImport( url )
      this.sheets.imported.set( url, {
        sheet,
        isScoped: scope,
        rel
      })
      
      this.shadow.adoptedStyleSheets = [
        ...this.shadow.adoptedStyleSheets,
        sheet
      ]
      
      return true
    }
    catch( error: any ){
      console.error(`Failed to add imported styles ${url}:`, error )
      return false
    }
  }

  removeRules( scoperel: string ): boolean {
    let removed = false
    
    /**
     * Helper function to remove styles by rel
     */
    const removeFromMap = ( map: Map<string, StyleMetadata> ) => {
      for( const [ rel, data ] of map.entries() ){
        if( data.rel === scoperel ){
          this.shadow.adoptedStyleSheets = this.shadow.adoptedStyleSheets.filter( s => s !== data.sheet )

          map.delete( rel )
          removed = true
        }
      }
    }
    
    // Remove from all style collections
    removeFromMap( this.sheets.inline )
    removeFromMap( this.sheets.linked )
    removeFromMap( this.sheets.imported )
    
    return removed
  }

  removeLink( href: string ): boolean {
    const styleData = this.sheets.linked.get( href )
    if( styleData ){
      this.shadow.adoptedStyleSheets = this.shadow.adoptedStyleSheets.filter( s => s !== styleData.sheet )
      this.sheets.linked.delete( href )

      return true
    }

    return false
  }

  removeImport( url: string ): boolean {
    const styleData = this.sheets.imported.get( url )
    if( styleData ){
      this.shadow.adoptedStyleSheets = this.shadow.adoptedStyleSheets.filter( s => s !== styleData.sheet )
      this.sheets.imported.delete( url )

      return true
    }

    return false
  }

  removeAll(){
    // Keep frame stylesheet
    this.shadow.adoptedStyleSheets = [ this.shadow.adoptedStyleSheets[0] ]

    this.sheets.inline.clear()
    this.sheets.linked.clear()
    this.sheets.imported.clear()
  }

  extractAll(): string {
    const parts: string[] = []
    
    /**
     * Helper function to extract styles from a map
     */
    const extractFromMap = ( map: Map<string, StyleMetadata>, type: string ) => {
      for( const [ rel, data ] of map.entries() ){
        parts.push(`/* ${type}: ${rel} */`)

        data.rel && parts.push(`/* Scoped to view: ${data.rel} */`)

        parts.push( Array.from( data.sheet.cssRules ).map( rule => rule.cssText ).join('\n'))
        parts.push('\n')
      }
    }
    
    extractFromMap( this.sheets.inline, 'Inline styles' )
    extractFromMap( this.sheets.linked, 'Linked stylesheet' )
    extractFromMap( this.sheets.imported, 'Imported styles' )
    
    return parts.join('\n')
  }

  setVariables( updates?: Record<string, string | Record<string, string>> ){
    /**
     * Apply properties updates to the variables
     */
    typeof updates == 'object' 
    && Object.keys( updates ).length
    && Object.entries( updates )
              .map( ([ prop, value ]) => {
                if( !CSS_CUSTOM_VARIABLES[ prop ] ) return
                CSS_CUSTOM_VARIABLES[ prop ].value = value
              })

    /**
     * Generate CSS rule string
     */
    let varStr = ''
    Object
    .values( CSS_CUSTOM_VARIABLES )
    .forEach( ({ name, value }) => {
      value = typeof value == 'object' ? value['*'] : value
      varStr += `\t${name}: ${value};\n`
    })

    varStr && this.addRules(`:host { ${varStr} }`, { rel: 'variables' })
  }
  
  rules(){
    const selectors: Record<string, Record<string, string>> = {}

    Array
    .from( document.styleSheets )
    /**
     * Allow only same-domain stylesheet to be read
     * to avoid cross-origin content policy error
     */
    .filter( sheet => (!sheet.href || sheet.href.indexOf( window.location.origin ) === 0))
    .forEach( sheet => {
      // Only style rules
      const rules = Array.from( sheet.cssRules || sheet.rules )
                          .filter( ( rule ) => rule.type === 1 ) as CSSStyleRule[]
      
      rules.forEach( ({ style, selectorText }) => {
        selectorText = selectorText.trim()
        if( /[:,#>\[ ]/.test( selectorText )
            || ['html', 'body'].includes( selectorText ) ) 
          return

        const record: Record<string, string> = {}

        Array
        .from( style )
        .map( prop => record[ prop.trim() ] = style.getPropertyValue( prop ).trim() )

        // Bounce empty rules
        if( !Object.keys( record ).length ) return

        /**
         * Contain properties defined under a css rule
         * 
         * Allow to collect even selector defined
         * multiple times with different properties.
         */
        selectors[ selectorText ] = { ...selectors[ selectorText ], ...record }
      })
    })
    
    return selectors
  }
}

// Add styles for a view
// await styles.addRules('view1', `
//   .header { color: blue; }
//   .content { padding: 20px; }
// `);

// // Add linked stylesheet
// await styles.addLink('/styles/theme.css');

// // Add imported styles
// await styles.addImport('/styles/components.css');

// // Later, extract all styles for production
// const productionCss = styles.extractAll();
    