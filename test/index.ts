import { runLipsBenchmarkWithStats } from './lips-benchmark';

// HTML template that includes all three frameworks for side-by-side comparison
const comparisonTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Framework Benchmarks: Lips vs SolidJS vs React</title>
  
  <!-- Bootstrap for styling -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
  
  <style>
    body {
      padding: 20px;
    }
    .framework-container {
      margin-bottom: 40px;
      padding: 15px;
      border: 1px solid #eee;
      border-radius: 8px;
    }
    .results-display {
      margin-top: 20px;
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 4px;
    }
    .test-controls {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 15px;
    }
    .metrics-table {
      width: 100%;
      margin-top: 20px;
    }
    .metrics-table th, .metrics-table td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    .metrics-table th {
      background-color: #f2f2f2;
    }
    .winner {
      font-weight: bold;
      color: #198754;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="mb-4">UI Framework Benchmarks</h1>
    
    <div class="row mb-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Test Controls</h5>
            <button id="run-all-tests" class="btn btn-primary">Run All Tests</button>
          </div>
          <div class="card-body">
            <div class="test-controls">
              <button class="btn btn-outline-primary test-btn" data-test="create1000">Create 1,000 rows</button>
              <button class="btn btn-outline-primary test-btn" data-test="create10000">Create 10,000 rows</button>
              <button class="btn btn-outline-primary test-btn" data-test="append1000">Append 1,000 rows</button>
              <button class="btn btn-outline-primary test-btn" data-test="updateEvery10th">Update every 10th row</button>
              <button class="btn btn-outline-primary test-btn" data-test="clear">Clear rows</button>
              <button class="btn btn-outline-primary test-btn" data-test="swapRows">Swap rows</button>
              <button class="btn btn-outline-primary test-btn" data-test="selectRow">Select row</button>
              <button class="btn btn-outline-primary test-btn" data-test="removeRow">Remove row</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <!-- Lips Framework Container -->
      <div class="col-md-4">
        <div class="framework-container" id="lips-container">
          <h3>Lips</h3>
          <div id="lips-app"></div>
          <div class="results-display">
            <h5>Results</h5>
            <div id="lips-results">Run tests to see results</div>
          </div>
        </div>
      </div>
      
      <!-- SolidJS Container -->
      <div class="col-md-4">
        <div class="framework-container" id="solid-container">
          <h3>SolidJS</h3>
          <div id="solid-app"></div>
          <div class="results-display">
            <h5>Results</h5>
            <div id="solid-results">Run tests to see results</div>
          </div>
        </div>
      </div>
      
      <!-- React Container -->
      <div class="col-md-4">
        <div class="framework-container" id="react-container">
          <h3>React</h3>
          <div id="react-app"></div>
          <div class="results-display">
            <h5>Results</h5>
            <div id="react-results">Run tests to see results</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="row mt-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h4>Comparative Results</h4>
          </div>
          <div class="card-body">
            <table class="metrics-table" id="comparison-table">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Lips</th>
                  <th>SolidJS</th>
                  <th>React</th>
                  <th>Winner</th>
                </tr>
              </thead>
              <tbody>
                <!-- Results will be filled here -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Scripts to load and initialize the frameworks -->
  <script type="module">
    // Import our Lips benchmark implementation
    import { runLipsBenchmarkWithStats } from './lips-benchmark.js';
    
    // We'll need to import the actual SolidJS and React benchmarks from their respective modules
    // For this example, we'll stub them out
    
    // Placeholder for SolidJS benchmark
    const runSolidBenchmark = () => {
      const solidApp = document.getElementById('solid-app');
      solidApp.innerHTML = '<div class="alert alert-info">SolidJS benchmark would render here</div>';
      
      // Mock functions for demonstration
      return {
        create1000: () => mockBenchmark('create1000', 10, 15),
        create10000: () => mockBenchmark('create10000', 80, 120),
        append1000: () => mockBenchmark('append1000', 15, 25),
        updateEvery10th: () => mockBenchmark('updateEvery10th', 5, 10),
        clear: () => mockBenchmark('clear', 3, 8),
        swapRows: () => mockBenchmark('swapRows', 1, 3),
        selectRow: () => mockBenchmark('selectRow', 0.5, 1.5),
        removeRow: () => mockBenchmark('removeRow', 5, 10)
      };
    };
    
    // Placeholder for React benchmark
    const runReactBenchmark = () => {
      const reactApp = document.getElementById('react-app');
      reactApp.innerHTML = '<div class="alert alert-info">React benchmark would render here</div>';
      
      // Mock functions with slight performance penalty compared to SolidJS
      return {
        create1000: () => mockBenchmark('create1000', 18, 25),
        create10000: () => mockBenchmark('create10000', 150, 200),
        append1000: () => mockBenchmark('append1000', 20, 30),
        updateEvery10th: () => mockBenchmark('updateEvery10th', 12, 18),
        clear: () => mockBenchmark('clear', 5, 10),
        swapRows: () => mockBenchmark('swapRows', 2, 4),
        selectRow: () => mockBenchmark('selectRow', 1, 2),
        removeRow: () => mockBenchmark('removeRow', 8, 15)
      };
    };
    
    // Helper function to simulate a benchmark with random timing in a range
    function mockBenchmark(name, min, max) {
      return new Promise(resolve => {
        const startTime = performance.now();
        
        // Simulate work with a delay
        setTimeout(() => {
          const duration = Math.random() * (max - min) + min;
          resolve({
            name,
            duration,
            memory: Math.random() * 10 + 20 // Mock memory usage between 20-30MB
          });
        }, duration);
      });
    }
    
    // Store all benchmark results
    const results = {
      lips: {},
      solid: {},
      react: {}
    };
    
    // Initialize all frameworks
    const lipsInstance = runLipsBenchmarkWithStats('lips-app');
    const solidInstance = runSolidBenchmark();
    const reactInstance = runReactBenchmark();
    
    // Function to run a specific test across all frameworks
    async function runTest(testName) {
      // Update UI to show test is running
      document.querySelectorAll('.test-btn').forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.test === testName) {
          btn.classList.add('btn-primary');
          btn.classList.remove('btn-outline-primary');
        }
      });
      
      try {
        // Run test on Lips (actual implementation)
        console.log('Running '+ testName +' on Lips...');
        const lipsStartTime = performance.now();
        
        // Call the appropriate method on the Lips component
        await lipsInstance.component.handler[testName]();
        
        const lipsDuration = performance.now() - lipsStartTime;
        const lipsMemory = getMemoryUsage();
        
        results.lips[testName] = {
          duration: lipsDuration,
          memory: lipsMemory
        };
        
        updateResultsDisplay('lips', testName, lipsDuration, lipsMemory);
        
        // Run test on SolidJS (mock implementation)
        console.log('Running '+ testName +' on SolidJS...');
        const solidResult = await solidInstance[testName]();
        
        results.solid[testName] = {
          duration: solidResult.duration,
          memory: solidResult.memory
        };
        
        updateResultsDisplay('solid', testName, solidResult.duration, solidResult.memory);
        
        // Run test on React (mock implementation)
        console.log('Running '+ testName +' on React...');
        const reactResult = await reactInstance[testName]();
        
        results.react[testName] = {
          duration: reactResult.duration,
          memory: reactResult.memory
        };
        
        updateResultsDisplay('react', testName, reactResult.duration, reactResult.memory);
        
        // Update comparison table
        updateComparisonTable(testName);
      } finally {
        // Reset UI
        document.querySelectorAll('.test-btn').forEach(btn => {
          btn.disabled = false;
          btn.classList.remove('btn-primary');
          btn.classList.add('btn-outline-primary');
        });
      }
    }
    
    // Function to run all tests in sequence
    async function runAllTests() {
      const allTests = [
        'create1000',
        'create10000',
        'append1000',
        'updateEvery10th',
        'clear',
        'swapRows',
        'selectRow',
        'removeRow'
      ];
      
      document.getElementById('run-all-tests').disabled = true;
      document.getElementById('run-all-tests').textContent = 'Running...';
      
      for (const test of allTests) {
        await runTest(test);
        // Add a small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      document.getElementById('run-all-tests').disabled = false;
      document.getElementById('run-all-tests').textContent = 'Run All Tests';
    }
    
    // Helper to get current memory usage
    function getMemoryUsage() {
      if (window.performance && window.performance.memory) {
        return window.performance.memory.usedJSHeapSize / (1024 * 1024);
      }
      return 0;
    }
    
    // Update the results display for a framework
    function updateResultsDisplay(framework, testName, duration, memory) {
      const resultsElement = document.getElementById( framework +'-results');
      
      // Create or update the results table
      if (!resultsElement.querySelector('table')) {
        resultsElement.innerHTML = '<table class="table table-sm"><thead><tr><th>Test</th><th>Time (ms)</th><th>Memory (MB)</th></tr></thead><tbody></tbody></table>';
      }
      
      const tbody = resultsElement.querySelector('tbody');
      
      // Check if we already have a row for this test
      let row = Array.from(tbody.querySelectorAll('tr')).find(r => 
        r.querySelector('td').textContent === testName
      );
      
      if (!row) {
        row = document.createElement('tr');
        row.innerHTML = '<td>'+ testName +'</td><td></td><td></td>';
        tbody.appendChild(row);
      }
      
      // Update the values
      row.querySelectorAll('td')[1].textContent = duration.toFixed(2);
      row.querySelectorAll('td')[2].textContent = memory ? memory.toFixed(2) : 'N/A';
    }
    
    // Update the comparison table
    function updateComparisonTable(testName) {
      const table = document.getElementById('comparison-table');
      const tbody = table.querySelector('tbody');
      
      // Check if we already have a row for this test
      let row = Array.from(tbody.querySelectorAll('tr')).find(r => 
        r.querySelector('td').textContent === testName
      );
      
      if (!row) {
        row = document.createElement('tr');
        row.innerHTML = '<td>'+ testName +'</td><td></td><td></td><td></td><td></td>';
        tbody.appendChild(row);
      }
      
      // Get durations for all frameworks
      const lipsDuration = results.lips[testName]?.duration || 0;
      const solidDuration = results.solid[testName]?.duration || 0;
      const reactDuration = results.react[testName]?.duration || 0;
      
      // Update cells
      const cells = row.querySelectorAll('td');
      cells[1].textContent = lipsDuration ? lipsDuration.toFixed(2) : 'N/A';
      cells[2].textContent = solidDuration ? solidDuration.toFixed(2) : 'N/A';
      cells[3].textContent = reactDuration ? reactDuration.toFixed(2) : 'N/A';
      
      // Determine winner (lowest duration)
      let winner = '';
      if (lipsDuration && solidDuration && reactDuration) {
        const durations = [
          { name: 'Lips', value: lipsDuration },
          { name: 'SolidJS', value: solidDuration },
          { name: 'React', value: reactDuration }
        ];
        
        durations.sort((a, b) => a.value - b.value);
        winner = durations[0].name;
        
        // Highlight the winner's cell
        cells[winner === 'Lips' ? 1 : winner === 'SolidJS' ? 2 : 3].classList.add('winner');
      }
      
      cells[4].textContent = winner;
    }
    
    // Set up event listeners
    document.querySelectorAll('.test-btn').forEach(btn => {
      btn.addEventListener('click', () => runTest(btn.dataset.test));
    });
    
    document.getElementById('run-all-tests').addEventListener('click', runAllTests);
  </script>
</body>
</html>
`;

export function startComparisonBenchmark() {
  // In a real implementation, we would:
  // 1. Create a new HTML file with the template
  // 2. Serve it using a local development server
  // 3. Open it in the browser
  
  console.log('To run the comparison benchmark:');
  console.log('1. Create a new HTML file with the template content');
  console.log('2. Serve it using a local development server (e.g., "npx serve")');
  console.log('3. Open it in your browser');
  
  return comparisonTemplate;
}

// Function to create a standalone JS-framework-benchmark compatible implementation
export function createJSFrameworkBenchmarkImplementation() {
  // Create the necessary files for the js-framework-benchmark
  
  // 1. Create package.json
  const packageJson = {
    "name": "js-framework-benchmark-lips",
    "version": "1.0.0",
    "description": "Benchmark implementation for the Lips Framework",
    "main": "index.js",
    "js-framework-benchmark": {
      "frameworkVersion": "1.0.0",
      "frameworkHomeURL": "https://github.com/your-username/lips",
      "issues": [
        {
          "text": "This is a custom implementation of the Lips Framework for benchmarking"
        }
      ]
    },
    "scripts": {
      "build-prod": "echo 'No build step required'",
      "start": "npx serve -s ."
    },
    "author": "Your Name",
    "license": "MIT",
    "dependencies": {
      "lips": "^1.0.0"
    }
  };
  
  // 2. Create index.html
  const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lips Framework • Benchmark</title>
  <link href="/css/currentStyle.css" rel="stylesheet"/>
</head>
<body>
  <div id="main">
    <div class="container">
      <div class="jumbotron">
        <div class="row">
          <div class="col-md-6">
            <h1>Lips Framework</h1>
          </div>
          <div class="col-md-6">
            <div class="row">
              <div class="col-sm-6 smallpad">
                <button type="button" class="btn btn-primary btn-block" id="run">Create 1,000 rows</button>
              </div>
              <div class="col-sm-6 smallpad">
                <button type="button" class="btn btn-primary btn-block" id="runlots">Create 10,000 rows</button>
              </div>
              <div class="col-sm-6 smallpad">
                <button type="button" class="btn btn-primary btn-block" id="add">Append 1,000 rows</button>
              </div>
              <div class="col-sm-6 smallpad">
                <button type="button" class="btn btn-primary btn-block" id="update">Update every 10th row</button>
              </div>
              <div class="col-sm-6 smallpad">
                <button type="button" class="btn btn-primary btn-block" id="clear">Clear</button>
              </div>
              <div class="col-sm-6 smallpad">
                <button type="button" class="btn btn-primary btn-block" id="swaprows">Swap Rows</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id="lips-app"></div>
    </div>
  </div>
  <script type="module" src="index.js"></script>
</body>
</html>
  `;
  
  // 3. Create index.js
  const indexJs = `
import Lips from './lips';

// Implement the benchmark app for Lips
function startBenchmark() {
  // Define state and handlers
  const state = {
    rows: [],
    selected: null
  };
  
  const handler = {
    buildData(count) {
      const data = [];
      for (let i = 0; i < count; i++) {
        data.push({
          id: i,
          label: \`Item #\${i}\`,
          value: Math.floor(Math.random() * 1000)
        });
      }
      return data;
    },
    
    run() {
      this.state.rows = this.buildData(1000);
    },
    
    runlots() {
      this.state.rows = this.buildData(10000);
    },
    
    add() {
      this.state.rows = [...this.state.rows, ...this.buildData(1000)];
    },
    
    update() {
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
    
    clear() {
      this.state.rows = [];
    },
    
    swaprows() {
      if (this.state.rows.length <= 998) return;
      
      const newRows = [...this.state.rows];
      const temp = newRows[1];
      newRows[1] = newRows[998];
      newRows[998] = temp;
      this.state.rows = newRows;
    },
    
    remove(id) {
      this.state.rows = this.state.rows.filter(row => row.id !== id);
    },
    
    select(id) {
      this.state.selected = id;
    }
  };
  
  // Define the template
  const template = \`
    <table class="table table-hover table-striped test-data">
      <tbody>
        <for [row] in=state.rows>
          <tr class="{state.selected === row.id ? 'selected' : ''}" on-click(() => self.select(row.id))>
            <td class="col-md-1">{row.id}</td>
            <td class="col-md-4">
              <a>{row.label}</a>
            </td>
            <td class="col-md-1">
              <a on-click(e => { e.stopPropagation(); self.remove(row.id); })>
                <span class="glyphicon glyphicon-remove" aria-hidden="true"></span>
              </a>
            </td>
            <td class="col-md-6">{row.value}</td>
          </tr>
        </for>
      </tbody>
    </table>
  \`;
  
  // Initialize Lips
  const lips = new Lips({ debug: false });
  
  // Render the app
  const app = lips.render('BenchmarkApp', { default: template, state, handler }, {});
  app.appendTo('#lips-app');
  
  // Wire up button event listeners
  document.getElementById('run').addEventListener('click', () => app.handler.run());
  document.getElementById('runlots').addEventListener('click', () => app.handler.runlots());
  document.getElementById('add').addEventListener('click', () => app.handler.add());
  document.getElementById('update').addEventListener('click', () => app.handler.update());
  document.getElementById('clear').addEventListener('click', () => app.handler.clear());
  document.getElementById('swaprows').addEventListener('click', () => app.handler.swaprows());
}

// Start the benchmark when the page is loaded
window.addEventListener('load', startBenchmark);
  `;
  
  // Return instructions
  console.log('To create a js-framework-benchmark implementation for Lips:');
  console.log('1. Create a new directory: js-framework-benchmark-lips');
  console.log('2. Create package.json with the content provided');
  console.log('3. Create index.html with the content provided');
  console.log('4. Create index.js with the content provided');
  console.log('5. Copy your Lips framework files into the directory');
  console.log('6. Run the benchmark with: npm start');
  
  return {
    packageJson,
    indexHtml,
    indexJs
  };
}