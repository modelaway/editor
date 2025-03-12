import Lips from '../src/lips/lips';
import type { Handler, Template } from '../src/lips';

// Types for our benchmark app
interface RowData {
  id: number;
  label: string;
  value: number;
}

interface BenchmarkState {
  rows: RowData[];
  selected: number | null;
}

// Create a benchmark implementation for Lips
export function runLipsBenchmark(targetElement: string = 'body') {
  const state: BenchmarkState = {
    rows: [],
    selected: null
  };

  const handler: Handler<any, BenchmarkState> = {
    // Data generation
    buildData(count: number) {
      const data: RowData[] = [];
      for (let i = 0; i < count; i++) {
        data.push({
          id: i,
          label: `Item #${i}`,
          value: Math.floor(Math.random() * 1000)
        });
      }
      return data;
    },

    // Benchmark actions
    create1000() {
      this.state.rows = this.buildData(1000);
    },
    
    create10000() {
      this.state.rows = this.buildData(10000);
    },
    
    replaceAll() {
      this.state.rows = this.buildData(10000);
    },
    
    clear() {
      this.state.rows = [];
    },
    
    append1000() {
      this.state.rows = [...this.state.rows, ...this.buildData(1000)];
    },
    
    updateEvery10th() {
      const newRows = [...this.state.rows];
      for (let i = 0; i < newRows.length; i += 10) {
        if (newRows[i]) {
          newRows[i] = {
            ...newRows[i],
            value: Math.floor(Math.random() * 1000)
          };
        }
      }
      this.state.rows = newRows;
    },
    
    swapRows() {
      if (this.state.rows.length <= 998) return;
      
      const newRows = [...this.state.rows];
      const temp = newRows[1];
      newRows[1] = newRows[998];
      newRows[998] = temp;
      this.state.rows = newRows;
    },
    
    removeRow(id: number) {
      this.state.rows = this.state.rows.filter(row => row.id !== id);
    },
    
    selectRow(id: number) {
      this.state.selected = id;
    },

    // Lifecycle methods for debugging
    onMount() {
      console.log('Benchmark app mounted');
    },
    
    onRender() {
      console.time('renderCycle');
    },
    
    onUpdate() {
      console.timeEnd('renderCycle');
    }
  };

  // Define a row template as a macro for reuse
  const macros = `
    <macro [row, selected, onSelect, onRemove] name="benchmark-row">
      <tr class="{selected === row.id ? 'selected' : ''}" on-click(() => onSelect(row.id))>
        <td class="col-md-1">{row.id}</td>
        <td class="col-md-4">
          <a>{row.label}</a>
        </td>
        <td class="col-md-1">
          <a on-click(e => { e.stopPropagation(); onRemove(row.id); })>
            <span class="glyphicon glyphicon-remove" aria-hidden="true"></span>
          </a>
        </td>
        <td class="col-md-6">{row.value}</td>
      </tr>
    </macro>
  `;

  // Main template for the benchmark app
  const template = `
    <div class="container">
      <div class="jumbotron">
        <div class="row">
          <div class="col-md-6">
            <h1>Lips Framework Benchmark</h1>
          </div>
          <div class="col-md-6">
            <div class="row">
              <div class="col-sm-6 smallpad">
                <button id="create1000" class="btn btn-primary btn-block" type="button" on-click(self.create1000)>Create 1,000 rows</button>
              </div>
              <div class="col-sm-6 smallpad">
                <button id="create10000" class="btn btn-primary btn-block" type="button" on-click(self.create10000)>Create 10,000 rows</button>
              </div>
              <div class="col-sm-6 smallpad">
                <button id="append1000" class="btn btn-primary btn-block" type="button" on-click(self.append1000)>Append 1,000 rows</button>
              </div>
              <div class="col-sm-6 smallpad">
                <button id="updateEvery10th" class="btn btn-primary btn-block" type="button" on-click(self.updateEvery10th)>Update every 10th row</button>
              </div>
              <div class="col-sm-6 smallpad">
                <button id="clear" class="btn btn-primary btn-block" type="button" on-click(self.clear)>Clear</button>
              </div>
              <div class="col-sm-6 smallpad">
                <button id="swapRows" class="btn btn-primary btn-block" type="button" on-click(self.swapRows)>Swap Rows</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <table class="table table-hover table-striped test-data">
        <tbody>
          <for [row] in=state.rows>
            <benchmark-row 
              row=row 
              selected=state.selected 
              onSelect=self.selectRow 
              onRemove=self.removeRow
            />
          </for>
        </tbody>
      </table>
      
      <span class="preloadicon glyphicon glyphicon-remove" aria-hidden="true"></span>
    </div>
  `;

  // Optional CSS for styling the benchmark app
  const stylesheet = `
    .selected {
      background-color: #d9edf7;
    }
    .col-md-6 {
      padding: 0;
    }
    .jumbotron {
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .smallpad {
      padding: 0.25rem;
    }
  `;

  // Create a Lips instance with debug mode
  const lips = new Lips({ debug: true });
  
  // Render the benchmark app
  const benchmarkApp = lips.render(
    'BenchmarkApp', 
    { 
      default: template, 
      state, 
      handler, 
      macros,
      stylesheet
    }, 
    {} // Empty input
  );
  
  // Append to target element
  benchmarkApp.appendTo(targetElement);
  
  // Return the component for external control if needed
  return benchmarkApp;
}

// Advanced version with performance tracking
export function runLipsBenchmarkWithStats(targetElement: string = 'body') {
  // Create a performance tracking utility
  const perfMetrics = {
    startTimes: {} as Record<string, number>,
    results: {} as Record<string, number[]>,
    
    start(operation: string) {
      this.startTimes[operation] = performance.now();
    },
    
    end(operation: string) {
      if (!this.startTimes[operation]) return;
      
      const duration = performance.now() - this.startTimes[operation];
      if (!this.results[operation]) {
        this.results[operation] = [];
      }
      this.results[operation].push(duration);
      
      // Log the result
      console.log(`${operation}: ${duration.toFixed(2)}ms`);
      
      delete this.startTimes[operation];
    },
    
    getAverage(operation: string) {
      if (!this.results[operation] || this.results[operation].length === 0) return 0;
      
      const sum = this.results[operation].reduce((a, b) => a + b, 0);
      return sum / this.results[operation].length;
    },
    
    getMetrics() {
      const metrics: Record<string, { avg: number, runs: number }> = {};
      
      for (const [operation, times] of Object.entries(this.results)) {
        metrics[operation] = {
          avg: this.getAverage(operation),
          runs: times.length
        };
      }
      
      return metrics;
    },
    
    report() {
      console.group('Lips Performance Metrics');
      
      for (const [operation, times] of Object.entries(this.results)) {
        const avg = this.getAverage(operation);
        console.log(`${operation}: avg ${avg.toFixed(2)}ms over ${times.length} runs`);
      }
      
      console.groupEnd();
    }
  };

  const state: BenchmarkState = {
    rows: [],
    selected: null
  };

  const handler: Handler<any, BenchmarkState> = {
    // Data generation
    buildData(count: number) {
      const data: RowData[] = [];
      for (let i = 0; i < count; i++) {
        data.push({
          id: i,
          label: `Item #${i}`,
          value: Math.floor(Math.random() * 1000)
        });
      }
      return data;
    },

    // Benchmark actions with performance tracking
    create1000() {
      perfMetrics.start('create1000');
      this.state.rows = this.buildData(1000);
    },
    
    create10000() {
      perfMetrics.start('create10000');
      this.state.rows = this.buildData(10000);
    },
    
    replaceAll() {
      perfMetrics.start('replaceAll');
      this.state.rows = this.buildData(10000);
    },
    
    clear() {
      perfMetrics.start('clear');
      this.state.rows = [];
    },
    
    append1000() {
      perfMetrics.start('append1000');
      this.state.rows = [...this.state.rows, ...this.buildData(1000)];
    },
    
    updateEvery10th() {
      perfMetrics.start('updateEvery10th');
      const newRows = [...this.state.rows];
      for (let i = 0; i < newRows.length; i += 10) {
        if (newRows[i]) {
          newRows[i] = {
            ...newRows[i],
            value: Math.floor(Math.random() * 1000)
          };
        }
      }
      this.state.rows = newRows;
    },
    
    swapRows() {
      if (this.state.rows.length <= 998) return;
      
      perfMetrics.start('swapRows');
      const newRows = [...this.state.rows];
      const temp = newRows[1];
      newRows[1] = newRows[998];
      newRows[998] = temp;
      this.state.rows = newRows;
    },
    
    removeRow(id: number) {
      perfMetrics.start('removeRow');
      this.state.rows = this.state.rows.filter(row => row.id !== id);
    },
    
    selectRow(id: number) {
      perfMetrics.start('selectRow');
      this.state.selected = id;
    },

    // Lifecycle methods for performance tracking
    onMount() {
      console.log('Benchmark app mounted and ready for testing');
    },
    
    onRender() {
      // Nothing here - we track individual operations
    },
    
    onUpdate() {
      // Check if we need to end any performance measurement
      for (const operation of Object.keys(perfMetrics.startTimes)) {
        perfMetrics.end(operation);
      }
    },
    
    // Method to get memory usage
    getMemoryUsage() {
      if (window.performance && (window.performance as any).memory) {
        return ((window.performance as any).memory.usedJSHeapSize / (1024 * 1024)).toFixed(2) + ' MB';
      }
      return 'Memory usage information not available';
    },
    
    // Generate a report of all metrics
    generateReport() {
      perfMetrics.report();
      console.log('Memory Usage:', this.getMemoryUsage());
      
      // Add a visible report to the page
      const reportElement = document.createElement('div');
      reportElement.className = 'benchmark-report';
      reportElement.style.cssText = 'margin-top: 20px; padding: 15px; border: 1px solid #ddd; background-color: #f8f9fa;';
      
      const title = document.createElement('h3');
      title.textContent = 'Lips Framework Benchmark Results';
      reportElement.appendChild(title);
      
      const metrics = perfMetrics.getMetrics();
      const list = document.createElement('ul');
      
      for (const [operation, data] of Object.entries(metrics)) {
        const item = document.createElement('li');
        item.textContent = `${operation}: avg ${data.avg.toFixed(2)}ms over ${data.runs} runs`;
        list.appendChild(item);
      }
      
      const memoryItem = document.createElement('li');
      memoryItem.textContent = `Memory usage: ${this.getMemoryUsage()}`;
      list.appendChild(memoryItem);
      
      reportElement.appendChild(list);
      document.querySelector(targetElement)?.appendChild(reportElement);
    }
  };

  // Main template for the benchmark app with an additional report button
  const template = `
    <div class="container">
      <div class="jumbotron">
        <div class="row">
          <div class="col-md-6">
            <h1>Lips Framework Benchmark</h1>
          </div>
          <div class="col-md-6">
            <div class="row">
              <div class="col-sm-6 smallpad">
                <button id="create1000" class="btn btn-primary btn-block" type="button" on-click(self.create1000)>Create 1,000 rows</button>
              </div>
              <div class="col-sm-6 smallpad">
                <button id="create10000" class="btn btn-primary btn-block" type="button" on-click(self.create10000)>Create 10,000 rows</button>
              </div>
              <div class="col-sm-6 smallpad">
                <button id="append1000" class="btn btn-primary btn-block" type="button" on-click(self.append1000)>Append 1,000 rows</button>
              </div>
              <div class="col-sm-6 smallpad">
                <button id="updateEvery10th" class="btn btn-primary btn-block" type="button" on-click(self.updateEvery10th)>Update every 10th row</button>
              </div>
              <div class="col-sm-6 smallpad">
                <button id="clear" class="btn btn-primary btn-block" type="button" on-click(self.clear)>Clear</button>
              </div>
              <div class="col-sm-6 smallpad">
                <button id="swapRows" class="btn btn-primary btn-block" type="button" on-click(self.swapRows)>Swap Rows</button>
              </div>
              <div class="col-sm-6 smallpad">
                <button id="report" class="btn btn-success btn-block" type="button" on-click(self.generateReport)>Generate Report</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <table class="table table-hover table-striped test-data">
        <tbody>
          <for [row] in=state.rows>
            <tr class="{state.selected === row.id ? 'selected' : ''}" on-click(() => self.selectRow(row.id))>
              <td class="col-md-1">{row.id}</td>
              <td class="col-md-4">
                <a>{row.label}</a>
              </td>
              <td class="col-md-1">
                <a on-click(e => { e.stopPropagation(); self.removeRow(row.id); })>
                  <span class="glyphicon glyphicon-remove" aria-hidden="true"></span>
                </a>
              </td>
              <td class="col-md-6">{row.value}</td>
            </tr>
          </for>
        </tbody>
      </table>
      
      <span class="preloadicon glyphicon glyphicon-remove" aria-hidden="true"></span>
    </div>
  `;

  // Optional CSS for styling the benchmark app
  const stylesheet = `
    .selected {
      background-color: #d9edf7;
    }
    .col-md-6 {
      padding: 0;
    }
    .jumbotron {
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .smallpad {
      padding: 0.25rem;
    }
  `;

  // Create a Lips instance with debug mode
  const lips = new Lips({ debug: true });
  
  // Render the benchmark app
  const benchmarkApp = lips.render(
    'BenchmarkApp', 
    { 
      default: template, 
      state, 
      handler,
      stylesheet
    }, 
    {} // Empty input
  );
  
  // Append to target element
  benchmarkApp.appendTo(targetElement);
  
  // Return the component instance and the performance metrics
  return {
    component: benchmarkApp,
    metrics: perfMetrics
  };
}

// Function to run a specific benchmark test
export function runSingleBenchmark(test: string, targetElement: string = 'body') {
  const benchmarkApp = runLipsBenchmark(targetElement);
  
  // Get the component instance
  const component = benchmarkApp as any;
  
  // Wait for the component to be mounted
  setTimeout(() => {
    console.log(`Running benchmark test: ${test}`);
    
    // Start timing
    const startTime = performance.now();
    
    // Run the specified test
    switch (test) {
      case 'create1000':
        component.handler.create1000();
        break;
      case 'create10000':
        component.handler.create10000();
        break;
      case 'append1000':
        component.handler.create1000();
        setTimeout(() => {
          component.handler.append1000();
          logPerformance();
        }, 500);
        return; // Return early as we handle timing in the nested timeout
      case 'updateEvery10th':
        component.handler.create10000();
        setTimeout(() => {
          component.handler.updateEvery10th();
          logPerformance();
        }, 500);
        return; // Return early as we handle timing in the nested timeout
      case 'clear':
        component.handler.create1000();
        setTimeout(() => {
          component.handler.clear();
          logPerformance();
        }, 500);
        return; // Return early as we handle timing in the nested timeout
      case 'swapRows':
        component.handler.create1000();
        setTimeout(() => {
          component.handler.swapRows();
          logPerformance();
        }, 500);
        return; // Return early as we handle timing in the nested timeout
      default:
        console.error(`Unknown benchmark test: ${test}`);
        return;
    }
    
    function logPerformance() {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`${test} completed in ${duration.toFixed(2)}ms`);
      
      // Log memory usage if available
      if (window.performance && (window.performance as any).memory) {
        const memUsage = ((window.performance as any).memory.usedJSHeapSize / (1024 * 1024)).toFixed(2);
        console.log(`Memory usage: ${memUsage} MB`);
      }
    }
    
    // Log performance immediately for tests that don't need a timeout
    logPerformance();
  }, 100);
  
  return benchmarkApp;
}

// To use in browser:
// Import and call one of these functions:
// 
// Basic benchmark:
// import { runLipsBenchmark } from './lips-benchmark';
// runLipsBenchmark('#app');
//
// Benchmark with detailed performance metrics:
// import { runLipsBenchmarkWithStats } from './lips-benchmark';
// runLipsBenchmarkWithStats('#app');
//
// Run a specific benchmark test:
// import { runSingleBenchmark } from './lips-benchmark';
// runSingleBenchmark('create10000', '#app');