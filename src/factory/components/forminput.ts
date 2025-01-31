import {
  CONTROL_LANG_SELECTOR,
  FORM_INPUT_SELECTOR
} from '../../modules/constants'

const Inputs = () => {
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
                  placeholder="input.placeholder || input.label"
                  on-input( e => self.emit('input', e.target.value ) )
                  on-change( e => self.emit('change', e.target.value ) )>
        </mblock>
      </case>

      <case is="checkbox">
        <mblock ${FORM_INPUT_SELECTOR}=input.type>
          <input id=id
                  type=input.type
                  name=input.name
                  disabled=input.disabled
                  checked=input.checked
                  on-change( e => self.emit('change', e.target.checked ) )>
          <label for=id ${CONTROL_LANG_SELECTOR}>{input.label}</label>
        </mblock>
      </case>
    </switch>
  `

  const stylesheet = `
    display: flex;
    font-size: var(--me-font-size);
    margin-bottom: 0.8rem;

    [type="text"],
    [type="search"] {
      display: block;
      padding: .7rem .9rem;
      width: 100%;
      font-size: var(--me-font-size);
      border: 1px solid var(--me-border-color);
      border-radius: var(--me-border-radius);
      background-clip: padding-box;
      background-color: var(--me-input-color);
      transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;

      &:focus { outline: none; }
      &:disabled ~ label {
        color: var(--me-primary-color-transparent);
      }
    }

    [type="radio"],
    [type="checkbox"] {
      box-sizing: border-box;
      padding: 0;

      ~ label {
        position: relative;
        margin-bottom: 0;
        vertical-align: top;
        padding-left: 10px;

        &::before {
          position: absolute;
          top: -0.25rem;
          left: -1.25rem;
          display: block;
          width: 1.2rem;
          height: 1.2rem;
          pointer-events: none;
          content: "";
          background-color: #FFFFFF;
          border: 1px solid var(--me-border-color);
          border-radius: var(--me-border-radius-gentle);
        }
        &::after {
          position: absolute;
          top: -0.17rem;
          left: -1.4rem;
          display: block;
          width: 1.6rem;
          height: 1.2rem;
          content: "";
          color: #acaaaa;
          background: no-repeat 50% / 50% 50%;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 4'%3e%3cpath stroke='%23acaaaa' d='M0 2h4'/%3e%3c/svg%3e");
        }
      }

      &:checked ~ label::after {
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0.7 1 7 6.6'%3e%3cpath fill='%23000000' d='M6.564.75l-3.59 3.612-1.538-1.55L0 4.26 2.974 7.25 8 2.193z'/%3e%3c/svg%3e");
      }
      &:disabled {
        ~ label {
          color: var(--me-primary-color-transparent);
        }
        &:checked ~ label::after {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0.7 1 7 6.6'%3e%3cpath fill='%23acaaaa' d='M6.564.75l-3.59 3.612-1.538-1.55L0 4.26 2.974 7.25 8 2.193z'/%3e%3c/svg%3e");
        }
      }
      &:not(:disabled) ~ label { cursor: pointer; }
    }
  `

  return { default: template, stylesheet }
}

export default Inputs