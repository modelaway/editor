import type { Declaration, Handler } from '..'

export const declaration: Declaration = {
  name: 'if',
  contents: true,
  tags: {
    'else-if': { type: 'sibling', many: true },
    'else': { type: 'sibling' }
  }
}

export interface Input {
  by: boolean

}

export const handler: Handler<Input> = {
  onInput(){
    console.log( this.input )

    // const $ifContents = $node.contents()
    // if( !$ifContents.length ) return $()

    // const 
    // $fragment = $(),
    // condition = $node.attr('by')

    // // Evaluate the primary <if(condition)>
    // if( condition && $ifContents.length ){
    //   if( self.__evaluate__( condition, scope ) )
    //     return self.render( $ifContents, scope )

    //   // Check for <else-if(condition)> and <else>
    //   let $sibling = $node.nextAll('else-if, else').first()
    //   while( $sibling.length > 0 ){
    //     const $contents = $sibling.contents()

    //     if( $sibling.is('else-if') ){
    //       const elseIfCondition = $sibling.attr('by') as string
    //       if( self.__evaluate__( elseIfCondition, scope ) && $contents.length )
    //         return self.render( $contents, scope )
    //     } 
    //     else if( $sibling.is('else') && $contents.length )
    //       return self.render( $contents, scope )
        
    //     $sibling = $sibling.nextAll('else-if, else').first()
    //   }
    // }
  }
}

export default `<!--[IERP]-->`