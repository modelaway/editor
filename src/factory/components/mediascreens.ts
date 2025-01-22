import { MEDIA_SCREENS } from '../../modules/constants'

/**
 * Global plugins template
 */
const MediaScreens = () => {
  const state = {
    screens: MEDIA_SCREENS
  }

  const template = `
    <mblock>
      <mul>
        <for in="state.screens">
          <mli on-click(() => self.emit('change', { ...each, key }) )>
            <mblock>
              <switch( each.device )>
                <case is="mobile"><micon class="bx bx-mobile"></micon></case>
                <case is="tablet"><micon class="bx bx-tab"></micon></case>
                <case is="desktop"><micon class="bx bx-laptop"></micon></case>
                <case is="tv"><micon class="bx bx-tv"></micon></case>
              </switch>

              <mblock>{key}</mblock>
              <minline class="size">{parseInt( each.width )} x {parseInt( each.height )}</minline>
            </mblock>
          </mli>
        </for>
      </mul>
    </mblock>
  `

  const stylesheet = `
    mul {
      width: 100%;
      display: flex;
      flex-wrap: wrap;

      mli {
        position: relative;
        display: block;
        width: 100%;
        flex: 0 0 33.33333%;
        max-width: 33.33333%;
        
        > mblock {
          text-align: center;
          border-radius: var(--me-border-radius-inside);
          border: 1px solid var(--me-border-color);
          padding: 1rem 0;
          margin: .2rem;

          micon {
            display: inline-block;
            margin-bottom: .7rem;
            font-size: 3rem;
            color: var(--me-primary-color-transparent);
          }
          minline { 
            font-size: var(--me-small-font-size);
            color: gray;
          }

          &:hover {
            background-color: var(--me-primary-color-fade);
          }
          &:active {
            background-color: var(--me-primary-color-transparent);
          }
        }
      }
    }
  `

  return { default: template, state, stylesheet }
}

export default MediaScreens