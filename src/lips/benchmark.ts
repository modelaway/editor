import { deepClone } from './utils'

export interface BenchmarkMetrics {
  // Rendering metrics
  renderCount: number;
  elementCount: number;
  renderTime: number;
  avgRenderTime: number;
  maxRenderTime: number;

  // Component metrics
  componentCount: number;
  componentUpdateCount: number;
  
  // Partial metrics
  partialCount: number;
  partialUpdateCount: number;
  
  // Memory metrics
  memoryUsage?: number;
  
  // DOM operations
  domOperations: number;
  domInsertsCount: number;
  domUpdatesCount: number;
  domRemovalsCount: number;
  
  // Dependency tracking
  dependencyTrackCount: number;
  dependencyUpdateCount: number;
  
  // Batch update metrics
  batchSize: number;
  batchCount: number;
  
  // Error tracking
  errorCount: number;
}

export default class Benchmark {
  private debug: boolean
  private initialStats: BenchmarkMetrics = {
    // Rendering metrics
    renderCount: 0,
    elementCount: 0,
    renderTime: 0,
    avgRenderTime: 0,
    maxRenderTime: 0,
    
    // Component metrics
    componentCount: 0,
    componentUpdateCount: 0,
    
    // Partial metrics
    partialCount: 0,
    partialUpdateCount: 0,
    
    // Memory metrics - might be undefined in some environments
    memoryUsage: undefined,
    
    // DOM operations
    domOperations: 0,
    domInsertsCount: 0,
    domUpdatesCount: 0,
    domRemovalsCount: 0,
    
    // Dependency tracking
    dependencyTrackCount: 0,
    dependencyUpdateCount: 0,
    
    // Batch update metrics
    batchSize: 0,
    batchCount: 0,
    
    // Error tracking
    errorCount: 0
  }
  
  public stats: BenchmarkMetrics = this.reset()
  private renderStartTime: number = 0
  private renderTimes: number[] = []
  private measurementCount: number = 0
  private maxMeasurements: number = 100 // Rolling window size
  private loggingInterval: number = 10 // Log every 10 measurements
  private autoSaveInterval?: number // For auto-saving metrics
  
  constructor(debug = false){
    this.debug = debug
    
    // Setup auto-saving if debug is enabled
    if(this.debug){
      this.autoSaveInterval = window.setInterval(() => {
        this.saveMetricsToLocalStorage()
      }, 5000) // Every 5 seconds
    }
  }
  
  startRender(){
    if(!this.debug) return
    this.renderStartTime = performance.now()
  }
  
  endRender(){
    if(!this.debug || this.renderStartTime === 0) return
    
    const renderTime = performance.now() - this.renderStartTime
    this.stats.renderTime = renderTime
    this.stats.maxRenderTime = Math.max(this.stats.maxRenderTime, renderTime)
    
    // Keep a rolling window of render times
    this.renderTimes.push(renderTime)
    if(this.renderTimes.length > this.maxMeasurements){
      this.renderTimes.shift()
    }
    
    // Calculate average render time
    this.stats.avgRenderTime = this.renderTimes.reduce((sum, time) => sum + time, 0) / this.renderTimes.length
    
    this.renderStartTime = 0
    this.measurementCount++
  }
  
  trackMemory(){
    if(!this.debug) return
    
    if(window.performance && window.performance.memory){
      // @ts-ignore - Some browsers expose memory info
      this.stats.memoryUsage = window.performance.memory.usedJSHeapSize / (1024 * 1024)
    }
  }
  
  inc(metric: keyof BenchmarkMetrics){
    if(!this.debug) return
    if(typeof this.stats[metric] === 'number'){
      (this.stats[metric] as number)++
    }
  }
  
  dec(metric: keyof BenchmarkMetrics){
    if(!this.debug) return
    if(typeof this.stats[metric] === 'number' && (this.stats[metric] as number) > 0){
      (this.stats[metric] as number)--
    }
  }
  
  record(metric: keyof BenchmarkMetrics, value: number){
    if(!this.debug) return
    if(typeof this.stats[metric] !== 'undefined'){
      this.stats[metric] = value
    }
  }
  
  add(metric: keyof BenchmarkMetrics, value: number){
    if(!this.debug) return
    if(typeof this.stats[metric] === 'number'){
      (this.stats[metric] as number) += value
    }
  }
  
  reset(){
    this.renderTimes = []
    this.measurementCount = 0
    return this.stats = deepClone(this.initialStats)
  }
  
  log(){
    if(!this.debug) return
    
    // Only log periodically to reduce impact
    if(this.loggingInterval > 1 && this.measurementCount % this.loggingInterval !== 0) return
    
    // Group metrics by category for better readability
    const renderMetrics = {
      'Render Count': this.stats.renderCount,
      'Element Count': this.stats.elementCount,
      'Avg Render Time (ms)': this.stats.avgRenderTime.toFixed(2),
      'Max Render Time (ms)': this.stats.maxRenderTime.toFixed(2)
    }
    
    const componentMetrics = {
      'Component Count': this.stats.componentCount,
      'Component Updates': this.stats.componentUpdateCount
    }
    
    const partialMetrics = {
      'Partial Count': this.stats.partialCount,
      'Partial Updates': this.stats.partialUpdateCount
    }
    
    const domMetrics = {
      'DOM Operations': this.stats.domOperations,
      'DOM Inserts': this.stats.domInsertsCount,
      'DOM Updates': this.stats.domUpdatesCount,
      'DOM Removals': this.stats.domRemovalsCount
    }
    
    const dependencyMetrics = {
      'Dependencies Tracked': this.stats.dependencyTrackCount,
      'Dependency Updates': this.stats.dependencyUpdateCount
    }
    
    const batchMetrics = {
      'Batch Count': this.stats.batchCount,
      'Avg Batch Size': this.stats.batchCount > 0 ? 
        (this.stats.batchSize / this.stats.batchCount).toFixed(2) : '0'
    }
    
    // Log each category separately
    console.group('Lips Framework Performance Metrics')
    console.table(renderMetrics)
    console.table(componentMetrics)
    console.table(partialMetrics)
    console.table(domMetrics)
    console.table(dependencyMetrics)
    console.table(batchMetrics)
    
    if(this.stats.memoryUsage){
      console.log(`Memory Usage: ${this.stats.memoryUsage.toFixed(2)} MB`)
    }
    
    if(this.stats.errorCount > 0){
      console.warn(`Errors encountered: ${this.stats.errorCount}`)
    }
    
    console.groupEnd()
    
    // Option to export data for visualization
    if(window.localStorage && this.measurementCount % 10 === 0){
      this.saveMetricsToLocalStorage()
    }
  }
  
  private saveMetricsToLocalStorage(){
    try{
      const storedMetrics = JSON.parse(localStorage.getItem('lipsPerformanceMetrics') || '[]')
      storedMetrics.push({
        timestamp: Date.now(),
        metrics: { ...this.stats }
      })
      
      // Keep only the last 100 measurements
      if(storedMetrics.length > 100){
        storedMetrics.shift()
      }
      
      localStorage.setItem('lipsPerformanceMetrics', JSON.stringify(storedMetrics))
    }
    catch(e){
      // Silent fail - don't break app for metrics
    }
  }
  
  // Specialized tracking methods
  trackBatch(size: number){
    if(!this.debug) return
    this.stats.batchCount++
    this.stats.batchSize += size
  }
  
  trackError(error: Error){
    if(!this.debug) return
    this.stats.errorCount++
    console.error('Lips Framework Error:', error)
  }
  
  // Configure logging interval
  setLoggingInterval(interval: number){
    this.loggingInterval = interval
  }
  
  // Get a snapshot of current metrics
  getSnapshot(): BenchmarkMetrics{
    return deepClone(this.stats)
  }
  
  // Cleanup resources when done
  dispose(){
    if(this.autoSaveInterval){
      clearInterval(this.autoSaveInterval)
    }
  }
}