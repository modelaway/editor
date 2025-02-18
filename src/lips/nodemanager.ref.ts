
import $, { type Cash } from 'cash-dom'
import type Component from './component'
import type { VariableScope } from '.'
import { SPREAD_VAR_PATTERN } from './utils'

export type NodeType = 'container' | 'content' | 'element' | 'component'
export type NodeMeta = {
  $raw: Cash
  $parent: Cash | null
  index: number
  scope: VariableScope
  path: string
  type: NodeType
  containerType?: 'for' | 'if' | 'switch'
}

type NodeRef<Input, State, Static, Context> = {
  type: NodeType
  $fragment: Cash
  __update: () => void
  __deps: Set<string>
  __children: Set<string>
  __path: string
  __scope?: VariableScope
  containerType?: 'for' | 'if' | 'switch'
  instance?: Component<Input, State, Static, Context>
  __contentPaths?: Set<string>
  containerPath?: string
}

type DiffResult = {
  oldNode?: Element
  newNode?: Element
  type: 'replace' | 'update' | 'remove'
}

/**
 * NodeManager - Handles fine-grain updates for complex
 * conditional elements within Lips components
 */
export default class NodeManager<Input, State, Static, Context> {
  private __nodes = new Map<string, NodeRef<Input, State, Static, Context>>()
  private __pathEvents = new Map<string, Set<() => void>>()
  private __component: Component<Input, State, Static, Context>
  private __updateQueue = new Set<string>()
  private __isUpdating = false

  constructor( component: Component<Input, State, Static, Context> ){
    this.__component = component
  }

  register( path: string, meta: NodeMeta, render: () => Cash ): Cash {
    switch( meta.type ){
      case 'container':
        return this.__registerContainer( path, meta, render )
      case 'content':
        return this.__registerContent( path, meta, render )
      case 'element':
        return this.__registerElement( path, meta, render )
      case 'component':
        return this.__registerComponent( path, meta, render )
      default:
        throw new Error(`Invalid node type: ${meta.type}`)
    }
  }

  private __registerContainer( path: string, meta: NodeMeta, render: () => Cash ): Cash {
    if( !meta.containerType )
      throw new Error('Container type required for container nodes')

    // Cleanup existing node if being reused
    if( this.__nodes.has( path ) )
      this.__cleanupEvents( path )

    // Create container node tracking
    const nodeRef: NodeRef<Input, State, Static, Context> = {
      type: 'container',
      $fragment: $(),
      __update: () => this.__queueUpdate( path, meta, render ),
      __deps: new Set<string>(),
      __children: new Set<string>(),
      __path: path,
      __scope: meta.scope,
      containerType: meta.containerType,
      __contentPaths: new Set()
    }
    
    this.__nodes.set( path, nodeRef )
    this.__pathEvents.set( path, new Set() )
    
    // Link to parent if exists
    if( meta.$parent ){
      const parentNode = this.__nodes.get( meta.path )
      if( parentNode ) parentNode.__children.add( path )
    }

    // Initial render
    const $fragment = render()
    nodeRef.$fragment = $fragment

    // Track container dependencies
    this.__trackContainerDeps( path, meta )
    
    return $fragment
  }

  private __registerContent( path: string, meta: NodeMeta, render: () => Cash ): Cash {
    // Cleanup existing content if being reused
    if( this.__nodes.has( path ) )
      this.__cleanupEvents( path )

    // Find parent container
    const containerPath = this.__getParentPath( path )
    if( !containerPath )
      throw new Error('Content node must have a container parent')

    const container = this.__nodes.get( containerPath )
    if( !container || container.type !== 'container' )
      throw new Error('Invalid container reference')

    // Create content node tracking
    const nodeRef: NodeRef<Input, State, Static, Context> = {
      type: 'content',
      $fragment: $(),
      __update: () => this.__queueUpdate( path, meta, render ),
      __deps: new Set<string>(),
      __children: new Set<string>(),
      __path: path,
      __scope: meta.scope,
      containerPath
    }
    
    this.__nodes.set( path, nodeRef )
    this.__pathEvents.set( path, new Set() )
    
    // Link content to container
    container.__contentPaths?.add( path )
    
    // Initial render
    const $fragment = render()
    nodeRef.$fragment = $fragment

    console.log('track content deps --')

    // Track content dependencies
    this.__trackDependencies( path, meta.$raw )
    
    return $fragment
  }

  private __registerElement( path: string, meta: NodeMeta, render: () => Cash ): Cash {
    // Cleanup existing node if being reused
    if( this.__nodes.has( path ) )
      this.__cleanupEvents( path )

    // Create element node tracking
    const nodeRef: NodeRef<Input, State, Static, Context> = {
      type: 'element',
      $fragment: $(),
      __update: () => this.__queueUpdate( path, meta, render ),
      __deps: new Set<string>(),
      __children: new Set<string>(),
      __path: path,
      __scope: meta.scope
    }
    
    this.__nodes.set( path, nodeRef )
    this.__pathEvents.set( path, new Set() )
    
    // Initial render
    const $fragment = render()
    nodeRef.$fragment = $fragment

    // Track dependencies
    this.__trackDependencies( path, meta.$raw )
    
    return $fragment
  }

  private __registerComponent( path: string, meta: NodeMeta, render: () => Cash ): Cash {
    // Cleanup existing component if being reused
    if( this.__nodes.has( path ) )
      this.__cleanupEvents( path )

    const $rendered = render()
    if( !$rendered.length )
      throw new Error('Component render returned empty result')

    // Create component node tracking
    const nodeRef: NodeRef<Input, State, Static, Context> = {
      type: 'component',
      $fragment: $rendered,
      __update: () => this.__queueUpdate( path, meta, render ),
      __deps: new Set<string>(),
      __children: new Set<string>(),
      __path: path,
      __scope: meta.scope,
      instance: this.__component
    }
    
    this.__nodes.set( path, nodeRef )
    this.__pathEvents.set( path, new Set() )

    // Track component dependencies
    this.__trackDependencies( path, meta.$raw )
    
    return $rendered
  }

  private __queueUpdate( path: string, meta: NodeMeta, render: () => Cash ){
    this.__updateQueue.add( path )

    if( !this.__isUpdating ){
      this.__isUpdating = true
      
      Promise.resolve().then(() => {
        this.__processUpdateQueue( meta, render )
        this.__isUpdating = false

        console.log('Finished process update queue ...')
      })
    }
  }
  private __processUpdateQueue( meta: NodeMeta, render: () => Cash ){
    const processed = new Set<string>()
    
    const processNode = ( path: string ) => {
      if( processed.has( path ) ) return
      
      const node = this.__nodes.get( path )
      if( !node ) return
      
      // Process container first if this is content
      if( node.type === 'content' && node.containerPath )
        processNode( node.containerPath )
      
      // Update if queued
      if( this.__updateQueue.has( path ) ){
        this.__updateNode( path, meta, render )
        this.__updateQueue.delete( path )
      }
      
      processed.add( path )
    }
    
    this.__updateQueue.forEach( path => processNode( path ) )
  }

  private __updateNode( path: string, meta: NodeMeta, render: () => Cash ){
    const node = this.__nodes.get( path )
    if( !node ) return
    
    console.log('Update node ... ', node.type )

    // Skip update for detached nodes
    if( !node.$fragment.closest('body').length ){
      this.__cleanup( path )
      return
    }

    switch( node.type ){
      case 'container':
        this.__updateContainer( path, node, render )
        break
      
      case 'content':
        // Skip if container is updating
        if( node.containerPath && this.__updateQueue.has( node.containerPath ) )
          return
        
        this.__updateContent( path, node, render )
        break
      
      case 'element':
        // Elements don't need container check
        this.__updateContent( path, node, render )
        break

      case 'component':
        this.__updateComponent( path, node )
        break
    }
  }
  private __updateContainer( path: string, node: NodeRef<Input, State, Static, Context>, render: () => Cash ){
    // Cache current content state
    const existingContent = new Map<string, Cash>()
    node.__contentPaths?.forEach( contentPath => {
      const content = this.__nodes.get( contentPath )
      if( content?.type === 'content' ){
        existingContent.set( contentPath, content.$fragment )
      }
    })

    // Render new content
    const $newContent = render()
    
    // Only remove content that's no longer needed
    node.__contentPaths?.forEach( contentPath => {
      if( !$newContent.find(`[path="${contentPath}"]`).length ){
        const content = this.__nodes.get( contentPath )
        if( content?.type === 'content' ){
          content.$fragment.remove()
          this.__cleanup( contentPath )
        }
      }
    })

    node.$fragment = $newContent
  }
  private __updateContent( path: string, node: NodeRef<Input, State, Static, Context>, render: () => Cash ){
    const $old = node.$fragment
    const $new = render()

    console.log('update content --', $old, $new )

    this.__diffAndPatch( $old, $new, path )
    node.$fragment = $new
  }
  private __updateComponent( path: string, node: NodeRef<Input, State, Static, Context> ){
    if( !node.instance ) return
    
    // Let component handle its own update
    node.instance.rerender()
    
    // Track new dependencies after update
    this.__trackDependencies( path, node.instance.getNode() )
  }
  private __updateElement( $old: Cash, $new: Cash, path: string ){
    const
    extracted = ($new as any).attrs(),
    attributes: Record<string, any> = {}
    
    let spreadAttr: string | boolean = false
    
    const updateAttributes = () => {
      attributes && Object
      .entries( attributes )
      .forEach( ([ attr, value ]) => {
        switch( attr ){
          case 'html': {
            const updateHTML = () => $old.html( this.__component.__evaluate__( value, {} ) )
            updateHTML()
            this.addDependency( path, value, updateHTML )
          } break

          case 'text': {
            const updateText = () => {
              let text = this.__component.__evaluate__( value, {} )
              if( this.__component.lips && !$old.is('[no-translate]') ){
                const { text: _text } = this.__component.lips.i18n.translate( text )
                text = _text
              }
              $old.text( text )
            }
            updateText()
            this.addDependency( path, value, updateText )
          } break

          case 'style': {
            const updateStyle = () => {
              const style = this.__component.__evaluate__( value, {} )
              if( typeof style === 'object' ){
                let str = ''
                Object.entries( style ).forEach( ([ k, v ]) => str += `${k}:${v};` )
                str.length && $old.attr('style', str )
              }
              else $old.attr('style', style )
            }
            updateStyle()
            this.addDependency( path, value, updateStyle )
          } break

          default: {
            const updateAttribute = () => {
              const res = value ? 
                this.__component.__evaluate__( value, {} ) : 
                value !== undefined ? value : true

              res === undefined || res === false ?
                $old.removeAttr( attr ) :
                $old.attr( attr, res )
            }
            updateAttribute()
            this.addDependency( path, value, updateAttribute )
          }
        }
      })
    }

    const processSpread = () => {
      extracted && Object.entries( extracted ).forEach( ([ attr, value ]) => {
        if( SPREAD_VAR_PATTERN.test( attr ) ){
          const spreads = this.__component.__evaluate__( attr.replace( SPREAD_VAR_PATTERN, '' ), {} )
          if( typeof spreads !== 'object' )
            throw new Error(`Invalid spread operator ${attr}`)

          for( const _key in spreads )
            attributes[ _key ] = spreads[ _key ]
          
          if( this.__component.__isReactive__( attr ) )
            spreadAttr = attr
        }
        else attributes[ attr ] = value
      })
    }

    processSpread()
    updateAttributes()

    spreadAttr && this.addDependency( path, spreadAttr as string, () => {
      processSpread()
      updateAttributes()
    })

    // Handle children
    if( $old.contents().length || $new.contents().length )
      this.__updateChildren( $old, $new, path )
  }
  private __updateChildren( $old: Cash, $new: Cash, parentPath: string ){
    const
    oldChildren = $old.contents(),
    newChildren = $new.contents()
    
    newChildren.each( ( i, newChild ) => {
      const
      $newChild = $(newChild),
      $oldChild = $(oldChildren[i])
      
      if( $oldChild.length )
        this.__diffAndPatch( $oldChild, $newChild, `${parentPath}/${i}` )
      else 
        $old.append( $newChild )
    })

    // Remove extra old children
    oldChildren.slice( newChildren.length ).remove()
  }

  private __trackContainerDeps( path: string, meta: NodeMeta ){
    const node = this.__nodes.get( path )
    if( !node || node.type !== 'container' ) return
    
    let expr: string | null | undefined
    
    switch( meta.containerType ){
      case 'for': expr = meta.$raw.attr('in'); break
      case 'if':
      case 'switch': expr = meta.$raw.attr('by'); break
    }

    console.log('expression --', expr )
    
    if( expr && this.__component.__isReactive__( expr ) ){
      const deps = this.__component.__extractDeps__( expr )
      deps.forEach( dep => {
        node.__deps.add( dep )
        this.__component.__trackDep__( dep, $(), node.__update )
      })
    }
  }

  // private __queueUpdate( path: string, meta: NodeMeta, render: () => Cash ){
  //   this.__updateQueue.add( path )

  //   if( !this.__isUpdating ){
  //     this.__isUpdating = true
      
  //     // Batch updates in next microtask
  //     Promise.resolve().then(() => {
  //       this.__processUpdateQueue( meta, render )
  //       this.__isUpdating = false
  //     })
  //   }
  // }

  // private __processUpdateQueue( meta: NodeMeta, render: () => Cash ){
  //   // Process updates in dependency order
  //   const processed = new Set<string>()
    
  //   const processNode = ( path: string ) => {
  //     if( processed.has( path ) ) return
      
  //     const node = this.__nodes.get( path )
  //     if( !node ) return
      
  //     // Process parents first
  //     const parentPath = this.__getParentPath( path )
  //     if( parentPath ) processNode( parentPath )
      
  //     // Update this node if queued
  //     if( this.__updateQueue.has( path ) ){
  //       this.__updateNode( path, meta, render )
  //       this.__updateQueue.delete( path )
  //     }
      
  //     processed.add( path )
  //   }
    
  //   // Process all queued updates
  //   this.__updateQueue.forEach( path => processNode( path ) )
  // }

  // private __updateNode( path: string, meta: NodeMeta, render: () => Cash ){
  //   const node = this.__nodes.get( path )
  //   if( !node ) return

  //   // Skip update for detached nodes
  //   if( !node.$fragment.closest('body').length ){
  //     this.__cleanup( path )
  //     return
  //   }

  //   // Cache children states
  //   const childStates = this.__cacheChildStates( node )

  //   // Perform update
  //   const $newFragment = render()

  //   // Smart replacement with diffing
  //   this.__diffAndPatch( node.$fragment, $newFragment, path )

  //   // Restore children if needed
  //   this.__restoreChildren( node, childStates )

  //   // Retrack dependencies
  //   this.__trackDependencies( path, node.$fragment )
  // }

  private __cacheChildStates( node: NodeRef<Input, State, Static, Context> ): Map<string, { scope: VariableScope, $el: Cash }> {
    const states = new Map()
    
    node.__children.forEach( childPath => {
      const child = this.__nodes.get( childPath )
      if( child && child.__scope ){
        states.set( childPath, {
          scope: child.__scope,
          $el: child.$fragment
        })
      }
    })
    
    return states
  }

  private __restoreChildren( node: NodeRef<Input, State, Static, Context>, childStates: Map<string, { scope: VariableScope, $el: Cash }> ){
    childStates.forEach( ( state, childPath ) => {
      const child = this.__nodes.get( childPath )
      if( child && child.$fragment.closest('body').length ){
        if( !child.$fragment.parent().length ){
          this.__reattachChild( child, node.$fragment, state.scope )
        }
      }
    })
  }

  private __diffAndPatch( $old: Cash, $new: Cash, path: string ){
    // For regular elements, use existing element update logic
    if( this.__isRegularElement( $old ) ){
      this.__updateElement( $old, $new, path )
      return
    }

    // For conditional containers, preserve hierarchy
    if( $old.is('[data-container]') ){
      const oldContent = $old.children('[data-content]')
      const newContent = $new.children('[data-content]')
      
      oldContent.each( ( i, el ) => {
        const $oldChild = $(el)
        const $newChild = newContent.eq(i)
        
        if( $newChild.length ){
          this.__diffAndPatch( $oldChild, $newChild, `${path}/content-${i}` )
        } else {
          this.__removeNode( $oldChild, `${path}/content-${i}` )
        }
      })

      // Add new content
      newContent.slice( oldContent.length ).each( ( i, el ) => {
        const $newChild = $(el)
        this.__trackDependencies( `${path}/content-${oldContent.length + i}`, $newChild )
        $old.append( $newChild )
      })
      
      return
    }

    // Handle conditional container updates
    const differences = this.__findDifferences( $old, $new )
    
    differences.forEach( diff => {
      const
      $oldNode = $(diff.oldNode),
      $newNode = $(diff.newNode)
      
      switch( diff.type ){
        case 'replace':
          this.__replaceNode( $oldNode, $newNode, path )
          break
        
        case 'update':
          if( this.__isRegularElement( $oldNode ) )
            this.__updateElement( $oldNode, $newNode, path )
          else 
            this.__updateConditional( $oldNode, $newNode, path )
          break
          
        case 'remove':
          this.__removeNode( $oldNode, path )
          break
      }
    })
  }
  private __findDifferences( $old: Cash, $new: Cash ): DiffResult[] {
    const differences: DiffResult[] = []
    
    // Simple diff implementation - can be enhanced
    const
    oldNodes = $old.contents(),
    newNodes = $new.contents()
    
    const maxLength = Math.max( oldNodes.length, newNodes.length )
    
    for( let i = 0; i < maxLength; i++ ){
      const
      oldNode = oldNodes[i],
      newNode = newNodes[i]
      
      if( !oldNode && newNode ){
        differences.push({
          oldNode: oldNode,
          newNode: newNode,
          type: 'replace'
        })
      }
      else if( oldNode && !newNode ){
        differences.push({
          oldNode: oldNode,
          newNode: newNode,
          type: 'remove'
        })
      }
      else if( this.__shouldUpdateNode( oldNode as Element, newNode as Element ) ){
        differences.push({
          oldNode: oldNode,
          newNode: newNode,
          type: 'update'
        })
      }
    }
    
    return differences
  }
  private __shouldUpdateNode( oldNode: Element, newNode: Element ): boolean {
    if( oldNode.nodeType !== newNode.nodeType ) return true
    if( oldNode.nodeName !== newNode.nodeName ) return true
    
    // Compare attributes
    const
    oldAttrs = oldNode.attributes,
    newAttrs = newNode.attributes
    
    if( oldAttrs?.length !== newAttrs?.length ) return true
    
    for( let i = 0; i < oldAttrs?.length; i++ ){
      const
      oldAttr = oldAttrs[i],
      newAttr = newAttrs.getNamedItem( oldAttr.name )
      
      if( !newAttr || oldAttr.value !== newAttr.value )
        return true
    }
    
    return false
  }
  private __isRegularElement( $node: Cash ): boolean {
    const tag = $node.prop('tagName').toLowerCase()
    return tag && !['if', 'else', 'else-if', 'for', 'switch', 'case'].includes( tag )
  }

  private __trackDependencies( path: string, $node: Cash ){
    // Extract dependencies from node
    const deps = this.__extractDependencies( $node )

    // console.log('deps -- ', deps)
    
    // Set up tracking for each dependency
    deps.forEach( dep => {
      const node = this.__nodes.get( path )
      // console.log('Node track --', node, dep )
      if( node ){
        node.__deps.add( dep )
        this.__component.__trackDep__( dep, node.$fragment, node.__update )
      }
    })
  }

  private __extractDependencies( $node: Cash ): string[] {
    const deps = new Set<string>()
    
    // Extract from attributes
    const attrs = ($node as any).attrs()
    Object
    .entries( attrs )
    .forEach( ([key, value]) => {
      if( this.__component.__isReactive__( value as string ) ){
        const extracted = this.__component.__extractDeps__( value as string )
        extracted.forEach( dep => deps.add( dep ) )
      }
    })
    
    // Extract from content
    const content = $node.html()
    if( this.__component.__isReactive__( content ) ){
      const extracted = this.__component.__extractDeps__( content )
      extracted.forEach( dep => deps.add( dep ) )
    }
    
    return Array.from( deps )
  }

  addDependency( path: string, expr: string, update: () => void ){
    if( this.__component.__isReactive__( expr ) ){
      const deps = this.__component.__extractDeps__( expr )

      deps.forEach( dep => {
        const node = this.__nodes.get( path )
        if( node ){
          node.__deps.add( dep )
          // console.log('Node add --', node, node.$fragment )
          this.__component.__trackDep__( dep, node.$fragment, update )
        }
      })
    }
  }

  private __reattachChild( child: NodeRef<Input, State, Static, Context>, $parent: Cash, scope: VariableScope ){
    $parent.append( child.$fragment )
    child.__scope = scope
  }

  private __cleanupEvents( path: string ){
    const events = this.__pathEvents.get( path )
    if( events ){
      events.forEach( cleanup => cleanup() )
      events.clear()
    }
  }

  private __cleanup( path: string ){
    const node = this.__nodes.get( path )
    if( !node ) return

    // Cleanup children first
    node.__children.forEach( childPath => this.__cleanup( childPath ) )

    // Clear dependencies
    node.__deps.clear()
    
    // Clean up events
    this.__cleanupEvents( path )
    this.__pathEvents.delete( path )
    
    // Remove node tracking
    this.__nodes.delete( path )
  }

  private __getParentPath( path: string ): string | null {
    const parts = path.split('/')
    return parts.length > 1 ? parts.slice( 0, -1 ).join('/') : null
  }

  trackEvent( path: string, cleanup: () => void ){
    const events = this.__pathEvents.get( path )
    events && events.add( cleanup )
  }

  private __replaceNode( $old: Cash, $new: Cash, path: string ){
    // Cleanup old node's events and tracking
    this.__cleanupNodeTracking( path )
    
    // Replace the node
    $old.replaceWith( $new )
    
    // Setup tracking for new node
    this.__trackDependencies( path, $new )
  }

  private __updateConditional( $old: Cash, $new: Cash, path: string ){
    // Preserve important properties
    this.__preserveProperties( $old, $new )
    
    // Update content if needed
    if( this.__shouldUpdateContent( $old, $new ) ){
      $old.html( $new.html() )
      this.__trackDependencies( path, $old )
    }
  }

  private __removeNode( $node: Cash, path: string ){
    // Cleanup tracking before removal
    this.__cleanupNodeTracking( path )
    $node.remove()
  }

  private __cleanupNodeTracking( path: string ){
    const node = this.__nodes.get( path )
    if( !node ) return

    // Clear dependencies
    node.__deps.forEach( dep => {
      const depSet = this.__component.__dependencies.get( dep )
      if( depSet ){
        depSet.forEach( depInfo => {
          if( depInfo.$node.is( node.$fragment ) ){
            depSet.delete( depInfo )
          }
        })
      }
    })

    // Clear events
    this.__cleanupEvents( path )
  }

  private __preserveProperties( $old: Cash, $new: Cash ){
    // Preserve data attributes
    const oldData = ($old as any).data()
    Object
    .entries( oldData )
    .forEach( ([ key, value ]) => ($new as any).data( key, value ) )

    // Preserve important attributes
    const preserveAttrs = ['id', 'class', 'style']
    preserveAttrs.forEach( attr => {
      const value = $old.attr( attr )
      value && $new.attr( attr, value )
    })
  }

  private __shouldUpdateContent( $old: Cash, $new: Cash ): boolean {
    return $old.html() !== $new.html()
  }

  dispose(){
    // Cleanup all nodes
    this.__nodes.forEach( ( _, path ) => this.__cleanup( path ) )
    
    // Clear all maps
    this.__nodes.clear()
    this.__pathEvents.clear()
    this.__updateQueue.clear()
  }
}