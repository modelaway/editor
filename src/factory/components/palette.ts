/**
 * Global assets template
 */
const Palette = () => {
  const _static = {
    colors: [
      { name: 'Orange', code: '#ff7028' },
      { name: 'Green', code: '#116b1a' },
      { name: 'Turquoise', code: '#0a9887' },
      { name: 'Blue Sky', code: '#038fcc' },
      { name: 'Gray', code: '#696969' },
      { name: 'Light Black', code: '#2e2e2e' }
    ]
  }

  const template = `
    <mblock>
      <mul>
        <for [color] in=static.colors>
          <mli style="'background-color:'+ color.code" title=color.name></mli>
        </for>
      </mul>
    </mblock>
  `

  const stylesheet = `
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;

    mul {
      width: auto;

      mli {
        width: 23px;
        height: 23px;
        border-radius: 50%;
        margin: 18px 0;
        cursor: pointer;
      }
    }
  `

  return { default: template, _static, stylesheet }
}

export default Palette