import { FGUDependencies } from '.'
import Benchmark from './benchmark'

/**
 * Update Queue System for high-frequency DOM updates
 */
export default class UpdateQueue {
  private queue = new Set<string>()
  private isPending = false
  private dependencies?: FGUDependencies
  private benchmark: Benchmark
  
  // Metrics for tracking performance
  private metrics = {
    batchCount: 0,
    updatesProcessed: 0,
    lastBatchSize: 0,
    avgBatchSize: '0.00'
  }
  
  constructor( benchmark: Benchmark ){
    this.benchmark = benchmark
  }
  
  /**
   * Enqueue updates to be processed in the next tick
   */
  enqueue( dependencies: FGUDependencies, paths: Set<string> ){
    this.dependencies = dependencies
    
    // Add paths to the queue
    paths.forEach( path => {
      this.queue.add( path )
      this.benchmark.inc( 'dependencyUpdateCount' )
    })
    
    // Schedule processing if not already pending
    if( !this.isPending ){
      this.isPending = true
      this.scheduleProcessing()
    }
  }
  
  /**
   * Schedule processing using microtasks for better performance
   */
  private scheduleProcessing(){
    Promise.resolve().then( () => {
      this.processQueue()
    })
  }
  
  /**
   * Process all queued updates in a batch
   */
  private processQueue(){
    // Get all paths to process
    const pathsToProcess = Array.from( this.queue )
    
    // Update metrics
    this.metrics.batchCount++
    this.metrics.lastBatchSize = pathsToProcess.length
    this.metrics.updatesProcessed += pathsToProcess.length
    this.metrics.avgBatchSize = (this.metrics.updatesProcessed / this.metrics.batchCount).toFixed(2)
    
    // Clear the queue
    this.queue.clear()
    
    // Apply all updates
    this.applyUpdates( pathsToProcess )
    
    // Track batch stats
    this.benchmark.trackBatch( pathsToProcess.length )
    
    // Reset pending flag
    this.isPending = false
    
    // Check if more updates were queued during processing
    if( this.queue.size > 0 ){
      this.isPending = true
      this.scheduleProcessing()
    }
  }
  
  /**
   * Apply updates to the DOM
   */
  private applyUpdates( paths: string[] ){
    paths.forEach( path => {
      this.dependencies?.forEach( dependents => {
        const dependent = dependents.get( path )
        if( !dependent ) return
        
        try {
          // Apply the update
          const sync = dependent.update( dependent.memo, 'enhanced-batch-updator' )
          if( sync ){
            // Update fragment reference if provided
            // typeof sync.$fragment === 'object'
            // && sync.$fragment.length
            // && dependents.set( path, { ...dependent, $fragment: sync.$fragment } )
            
            // Update memo if provided
            typeof sync.memo === 'object'
            && sync.memo.length
            && dependents.set( path, { ...dependent, memo: sync.memo } )
            
            // Run cleanup if provided
            typeof sync.cleanup === 'function' && sync.cleanup()
          }
        }
        catch( error ){
          console.error( 'Failed to update dependency --', error )
        }
      })
    })
  }
  
  /**
   * Get current metrics
   */
  getMetrics(){
    return {
      batchCount: this.metrics.batchCount,
      lastBatchSize: this.metrics.lastBatchSize,
      avgBatchSize: this.metrics.avgBatchSize,
      totalUpdates: this.metrics.updatesProcessed
    }
  }
}