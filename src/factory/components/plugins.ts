/**
 * Global plugins template
 */
const GlobalPlugins = () => {
  const template = `
    <log( input )></log>
    <mblock>Global Plugins</mblock>
  `

  const stylesheet = ``

  return { default: template, stylesheet }
}

export default GlobalPlugins