import $, { type Cash } from 'cash-dom'
import type Component from './component'
import type { VariableScope } from '.'
import { SPREAD_VAR_PATTERN } from './utils'

export type NodeType = 'element' | 'component'
export type NodeMeta = {
  $raw: Cash
  $parent: Cash | null
  index: number
  scope: VariableScope
  path: string
  type: NodeType
}

type NodeRef = {
  type: NodeType
  $fragment: Cash
  __deps: Set<string>
  __path: string
  __contentPaths?: Set<string>
}

/**
 * NodeManager - Handles fine-grain updates for complex
 * conditional elements within Lips components
 */
export default class NodeManager {
  private __nodes = new Map<string, NodeRef>()
  private __pathEvents = new Map<string, Set<() => void>>()

  register( path: string, meta: NodeMeta, render: ( nodeRef: NodeRef ) => Cash ): Cash {
    switch( meta.type ){
      case 'element':
        return this.registerElement( path, meta, render )
      case 'component':
        return this.registerComponent( path, meta, render )
      default:
        throw new Error(`Invalid node type: ${meta.type}`)
    }
  }

  private cleanupEvents( path: string ){
    const events = this.__pathEvents.get( path )
    if( events ){
      events.forEach( cleanup => cleanup() )
      events.clear()
    }
  }
  private cleanup( path: string ){
    const node = this.__nodes.get( path )
    if( !node ) return

    // Clear dependencies
    node.__deps.clear()
    
    // Clean up events
    this.cleanupEvents( path )
    this.__pathEvents.delete( path )
    
    // Remove node tracking
    this.__nodes.delete( path )
  }

  private registerElement( path: string, meta: NodeMeta, render: ( nodeRef: NodeRef ) => Cash ): Cash {
    // Cleanup existing node if being reused 
    if( this.__nodes.has( path ) )
      this.cleanupEvents( path )

    // Create element node tracking
    const nodeRef: NodeRef = {
      type: 'element',
      $fragment: $(),
      __deps: new Set<string>(),
      __path: path
    }

    this.__nodes.set( path, nodeRef )
    this.__pathEvents.set( path, new Set() )

    // Initial render
    const $fragment = render( nodeRef )
    nodeRef.$fragment = $fragment

    return $fragment
  }
  private registerComponent( path: string, meta: NodeMeta, render: ( nodeRef: NodeRef ) => Cash ): Cash {
    // Cleanup existing node if being reused 
    if( this.__nodes.has( path ) )
      this.cleanupEvents( path )

    // Create element node tracking
    const nodeRef: NodeRef = {
      type: 'component',
      $fragment: $(),
      __deps: new Set<string>(),
      __path: path
    }

    this.__nodes.set( path, nodeRef )
    this.__pathEvents.set( path, new Set() )

    // Initial render
    const $fragment = render( nodeRef )
    nodeRef.$fragment = $fragment

    return $fragment
  }

  dispose(){
    // Cleanup all nodes
    this.__nodes.forEach( ( _, path ) => this.cleanup( path ) )
    
    // Clear all maps
    this.__nodes.clear()
    this.__pathEvents.clear()
  }
}