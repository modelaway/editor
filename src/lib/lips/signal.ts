/**
 * A particular Subscriber has many Dependencies 
 * it depends on
 */
type Subscriber = {
  execute(): void
  dependencies: Set<Dependency>
}
/**
 * A Dependency has many different Subscribers 
 * depending on it
 */ 
type Dependency = Set<Subscriber>
type Listener = () => unknown
type Signal<T> = [ () => T, ( nextValue: T ) => void ]

const context: Subscriber[] = []

function subscribe( running: Subscriber, subscriptions: Dependency ) {
  subscriptions.add( running )
  running.dependencies.add( subscriptions )
}
function cleanup( running: Subscriber ){
  for( const dep of running.dependencies )
    dep.delete( running )
  
  running.dependencies.clear()
}

export function signal<T>( value: T ): Signal<T> {
  const subscriptions: Dependency = new Set()

  const read = () => {
    const running = context[ context.length - 1 ]
    running && subscribe( running, subscriptions )

    return value
  }

  const write = ( nextValue: T ) => {
    value = nextValue

    for( const sub of [ ...subscriptions ] )
      sub.execute()
  }

  return [ read, write ]
}

export function effect( fn: Listener ){
  const execute = () => {
    cleanup( running )
    context.push( running )

    try { fn() }
    finally { context.pop() }
  }

  const running: Subscriber = {
    execute,
    dependencies: new Set()
  }

  execute()
}

export function memo( fn: Listener ){
  const [ s, set ] = signal<any>('')

  effect( () => set( fn() ) )
  return s
}