function execSwitch( $node: Cash ){
  const by = $node.attr('by')
  if( !by ) return $()

  const internal = () => {
    let $fragment = $()

    const switchBy = self.__evaluate__( by, scope )
    let matched = false
    
    $node.children().each( function(){
      const
      $child = $(this),
      $contents = $child.contents(),
      _is = $child.attr('is')

      if( matched ) return

      if( $child.is('case') && _is !== undefined ){
        const isValue = self.__evaluate__( _is as string, scope )

        if( (Array.isArray( isValue ) && isValue.includes( switchBy )) || isValue === switchBy ){
          matched = true
          
          if( $contents.length )
            $fragment = $fragment.add( self.render( $contents, scope ) )
        }
      }
      
      if( !matched && $child.is('default') && $contents.length )
        $fragment = $fragment.add( self.render( $contents, scope ) )
    })
      
    /**
     * BENCHMARK: Tracking total elements rendered
     */
    self.benchmark.inc('elementCount')

    // Add an (ESCP) Empty Switch-Case Placeholder
    if( !$fragment.length )
      $fragment = $fragment.add('<!--[ESCP]-->')

    return $fragment
  }

  let $fragment = internal()

  /**
   * Track the condition dependency
   */
  self.__isReactive__( by )
  && self.__trackDep__( by, $node, () => {
    console.log('------------------------------ Switch-case update')
    const 
    $newContent = internal(),
    $first = $fragment.first()
    if( !$first.length ){
      console.warn('stagged Switch-case fragment missing.')
      return
    }
  
    $fragment.each( ( _, el ) => { _ > 0 && $(el).remove() })
    $first.after( $newContent ).remove()
    
    // Update the fragment reference for future updates
    $fragment = $newContent
  })

  return $fragment
}