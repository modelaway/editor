// import styleLoader from 'bun-style-loader'
// import browserslist from 'browserslist'

// import type { BunPlugin } from 'bun'

// const theme_root = 'src/theme';
// const out_dir = './buntest';

const sassLoader = {
  name: 'Sass Loader',
  async setup( build ){
    const sass = await import('sass')

    // when a .scss file is imported...
    build.onLoad({ filter: /\.scss$/ }, ({ path }) => {
      // read and compile it with the sass compiler
      const contents = sass.compile( path )
      const css = contents.css

      return {
        loader: 'text',
        contents: css
      }
    })
  }
}

// const sassLoader = {
//   name: 'sass',
//   async setup(build) {
//     build.onLoad({ filter: /\.(sass|scss)$/ }, async args => {
//       const contents = await Bun.file(args.path).text()
//       return { exports: { default: contents }, loader: 'object' }
//     })
//   }
// }

// start build main.css
// globalThis.Bun.build({
//     entrypoints: [`${theme_root}/sass/main.scss`],
//     outdir: `${out_dir}/css`,
//     naming: '[name]-[hash].css',
//     plugins: [style],
// })

const result = await Bun.build({
  entrypoints: ['./src/modela.ts', './src/natives.loader.ts'],
  outdir: './dist',
  root: '.',
  target: 'browser',
  format: 'esm',
  sourcemap: 'external',
  minify: true,
  external: ['sass'],
  naming: {
    entry: '[name].min.[ext]',
    // chunk: '[name]-[hash].[ext]',
    // asset: '[name]-[hash].[ext]',
  },
  watch: true,
  // plugins: [
  //   sassLoader
  // ]
})

const result1 = await Bun.build({
  entrypoints: ['./src/styles.scss'],
  outdir: './dist',
  root: '.',
  target: 'browser',
  minify: true,
  naming: '[name].min.css',
  plugins: [
    sassLoader
  ]
})

if( !result1.success ){
  console.error('Build CSS failed')

  // Bun will pretty print the message object
  for( const message of result1.logs )
    console.error( message )
}
if( !result.success ){
  console.error('Build failed')

  // Bun will pretty print the message object
  for( const message of result.logs )
    console.error( message )
}