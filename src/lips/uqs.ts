import { FGUDependencies } from '.'
import Benchmark from './benchmark'

/**
 * Update Queue System for high-frequency DOM updates
 */
export default class UpdateQueue {
  private queue = new Map<string, boolean>()
  private isProcessing = false
  private frameDrops = 0
  private lastFrameTime = 0
  private processingTime = 0
  private framesBetweenMetrics = 60
  private frameCount = 0
  private dependencies?: FGUDependencies
  private benchmark: Benchmark
  
  private metrics = {
    avgProcessingTime: 0,
    maxProcessingTime: 0,
    framesDropped: 0,
    queueHighWatermark: 0
  }

  constructor( benchmark: Benchmark ){
    this.benchmark = benchmark
  }
  
  /**
   * Add updates to the queue
   */
  enqueue( dependencies: FGUDependencies, paths: Set<string> ){
    this.dependencies = dependencies

    // Add each path to the queue, overwriting any existing entry
    paths.forEach( path => {
      this.queue.set( path, true )
      this.benchmark.inc('dependencyUpdateCount')
    } )

    // Start processing if not already in progress
    !this.isProcessing && this.startProcessing()
  }

  /**
   * Begin processing the queue
   */
  private startProcessing(){
    this.isProcessing = true
    this.processNextBatch()
  }

  /**
   * Process updates in batches using requestAnimationFrame
   */
  private processNextBatch(){
    requestAnimationFrame( ( timestamp ) => {
      const processingStart = performance.now()
      
      // Calculate frame timing
      if( this.lastFrameTime > 0 ){
        const frameTime = timestamp - this.lastFrameTime

        // If frame time > 20ms (assuming 50fps as acceptable), count as dropped frame
        if( frameTime > 20 )
          this.frameDrops++
      }

      this.lastFrameTime = timestamp
      
      // Get all paths currently in the queue
      const pathsToProcess = Array.from( this.queue.keys() )
      this.metrics.queueHighWatermark = Math.max( this.metrics.queueHighWatermark, pathsToProcess.length )
      
      // Clear the queue for the current batch
      this.queue.clear()
      
      // Process each update path
      pathsToProcess.length > 0 && this.applyUpdates( pathsToProcess )

      // Track processing time
      const currentProcessingTime = performance.now() - processingStart

      this.processingTime += currentProcessingTime
      this.metrics.maxProcessingTime = Math.max( this.metrics.maxProcessingTime, currentProcessingTime )
      
      // Update frame count and log metrics periodically
      this.frameCount++
      // if( this.frameCount % this.framesBetweenMetrics === 0 )
      //   this.updateMetrics()
      
      // Continue processing if there are more updates in the queue,
      // otherwise end the processing cycle
      this.queue.size > 0
                ? this.processNextBatch()
                : this.isProcessing = false
    })
  }

  /**
   * Apply the updates to the DOM
   */
  private applyUpdates( paths: string[] ){
    paths.forEach( path => {
      // Find all dependencies for this path and update them
      this.dependencies?.forEach( dependents => {
        const dependent = dependents.get( path )
        if( !dependent ) return
        
        // Apply the update
        const sync = dependent.update( dependent.memo, 'mesh-batch-updator' )
        if( sync ){
          typeof sync.$fragment === 'object'
          && sync.$fragment.length
          && dependents.set( path, { ...dependent, $fragment: sync.$fragment } )
          
          typeof sync.cleanup === 'function' && sync.cleanup()
        }
      })
    })
  }

  /**
   * Update and log metrics
   */
  private updateMetrics(){
    this.metrics.avgProcessingTime = this.processingTime / this.frameCount
    this.metrics.framesDropped = this.frameDrops
    
    // Log metrics for debugging
    console.log('UQS Metrics:')
    console.table({
      avgProcessingTime: `${this.metrics.avgProcessingTime.toFixed( 2 )}ms`,
      maxProcessingTime: `${this.metrics.maxProcessingTime.toFixed( 2 )}ms`,
      framesDropped: this.metrics.framesDropped,
      queueHighWatermark: this.metrics.queueHighWatermark
    })
    
    // Reset metrics for next batch
    this.frameDrops = 0
    this.processingTime = 0
    this.frameCount = 0
    this.metrics.maxProcessingTime = 0
    this.metrics.queueHighWatermark = 0
  }
}