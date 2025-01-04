
import {
  CONTROL_LANG_SELECTOR,
  FORM_INPUT_SELECTOR,
  FORM_SEPERATOR_SELECTOR
} from '../modules/constants'

export const Inputs = () => {
  const template = `
    <const id="'input-'+ input.type +'-'+ (input.label || input.name).toLowerCase().replace(/\s+/g, '-')"></const>

    <switch( input.type )>
      <case is="['text', 'search']">
        <mblock ${FORM_INPUT_SELECTOR}=input.type>
          <!--<mlabel for=id>{input.label}</mlabel>-->
          <input ${CONTROL_LANG_SELECTOR}
                  id=id
                  type=input.type
                  name=input.name
                  title=input.label
                  value=input.value
                  disabled=input.disabled
                  pattern=input.pattern
                  autofocus=input.autofocus
                  placeholder="input.placeholder || input.label">
        </mblock>
      </case>

      <case is="checkbox">
        <mblock ${FORM_INPUT_SELECTOR}=input.type>
          <input id=id
                  type=input.type
                  name=input.name
                  disabled=input.disabled
                  checked=input.checked>
          <label for=id ${CONTROL_LANG_SELECTOR}>{input.label}</label>
        </mblock>
      </case>
    </switch>
  `

  return { default: template  }
}
