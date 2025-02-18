
function execFor( $node: Cash ){
  const
  $contents = $node.contents() as Cash
  if( !$contents.length ) return $()

  const
  $in = $node.attr('in') as any,
  $from = $node.attr('from') as any,
  $to = $node.attr('to') as any

  if( !$in && !$from && !$to ) return $()
  
  const internal = () => {
    let
    _in = self.__evaluate__( $in as string, scope ),
    _from = self.__evaluate__( $from as string, scope ),
    _to = self.__evaluate__( $to as string, scope )

    let $fragment = $()

    if( _from !== undefined ){
      _from = parseFloat( _from )

      if( _to == undefined )
        throw new Error('Expected <from> <to> attributes of the for loop to be defined')

      _to = parseFloat( _to )

      for( let x = _from; x <= _to; x++ )
        if( $contents.length ){
          const forScope: VariableScope = {
            ...scope,
            index: { value: x, type: 'const' }
          }

          $fragment = $fragment.add( self.render( $contents, forScope ) )
        }
    }

    else if( Array.isArray( _in ) ){
      let index = 0
      for( const each of _in ){
        if( $contents.length ){
          const forScope: VariableScope = {
            ...scope, 
            each: { value: each, type: 'const' },
            index: { value: index, type: 'const' }
          }

          $fragment = $fragment.add( self.render( $contents, forScope ) )
        }
        
        index++
      }
    }

    else if( _in instanceof Map ){
      let index = 0
      for( const [ key, value ] of _in ){
        if( $contents.length ){
          const forScope: VariableScope = {
            ...scope, 
            key: { value: key, type: 'const' },
            each: { value: value, type: 'const' },
            index: { value: index, type: 'const' }
          }

          $fragment = $fragment.add( self.render( $contents, forScope ) )
        }
        
        index++
      }
    }

    else if( typeof _in == 'object' ){
      let index = 0
      for( const key in _in ){
        if( $contents.length ){
          const forScope: VariableScope = {
            ...scope, 
            key: { value: key, type: 'const' },
            each: { value: _in[ key ], type: 'const' },
            index: { value: index, type: 'const' }
          }

          $fragment = $fragment.add( self.render( $contents, forScope ) )
        }
        
        index++
      }
    }
      
    /**
     * BENCHMARK: Tracking total elements rendered
     */
    self.benchmark.inc('elementCount')

    // Add an (EFLP) Empty For Loop Placeholder
    if( !$fragment.length )
      $fragment = $fragment.add('<!--[EFLP]-->')

    return $fragment
  }

  let $fragment = internal()
  
  /**
   * Track the condition dependency
   */
  ;( self.__isReactive__( $in ) 
    || self.__isReactive__( $from )
    || self.__isReactive__( $to ) )
  && self.__trackDep__( $in || $from || $to, $node, () => {
    console.log('------------------------------ For-loop update')
    const 
    $newContent = internal(),
    $first = $fragment.first()
    if( !$first.length ){
      console.warn('stagged For-loop fragment missing.')
      return
    }
  
    $fragment.each( ( _, el ) => { _ > 0 && $(el).remove() })
    $first.after( $newContent ).remove()
    
    // Update the fragment reference for future updates
    $fragment = $newContent
  })

  return $fragment
}