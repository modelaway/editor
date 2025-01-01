type ParallelTask = () => Promise<void> | void

export default class ParallelExecutor {
  private tasks: ParallelTask[] = []
  private running = false
  private maxConcurrent: number = 10

  constructor( maxConcurrent = 4 ){
    this.maxConcurrent = maxConcurrent
  }

  async add( task: ParallelTask ){
    this.tasks.push( task )
    !this.running && await this.run()
  }

  private async run(){
    this.running = true
    
    while( this.tasks.length > 0 ){
      const batch = this.tasks.splice( 0, this.maxConcurrent )

      await Promise.all( batch.map( task => {
        try { return Promise.resolve( task() ) }
        catch( error ){
          console.error('Task failed:', error )
          return Promise.reject( error )
        }
      }))
    }

    this.running = false
  }
}

// // Usage example:
// const executor = new ParallelExecutor(2) // Run 2 tasks concurrently

// const task1 = async () => {
//   await new Promise(resolve => setTimeout(resolve, 1000))
//   console.log('Task 1 complete')
// }

// const task2 = () => console.log('Task 2 complete')

// executor.add(task1)
// executor.add(task2)