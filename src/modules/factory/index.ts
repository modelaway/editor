import {
  CONTROL_LANG_SELECTOR,
  FORM_INPUT_SELECTOR,
  FORM_SEPERATOR_SELECTOR
} from '../constants'

export const createInput = ({ type, label, name, value, pattern, placeholder, autofocus, options, range, disabled }: InputOptions ) => {

  const id = `input-${type}-${(label || name).toLowerCase().replace(/\s+/, '-')}`

  switch( type ){
    case 'text':
    case 'search': {
      return `<mblock ${FORM_INPUT_SELECTOR}="${type}">
        <!--<mlabel for="${id}">${label}</mlabel>-->
        <input ${CONTROL_LANG_SELECTOR}
                id="${id}"
                type="${type}"
                name="${name}"
                ${label ? `title="${label}"`: ''}
                ${value ? `value="${value}"`: ''}
                ${disabled ? `disabled="true"`: ''}
                ${pattern ? `pattern="${pattern}"`: ''}
                ${autofocus ? `autofocus="${autofocus}"`: ''}
                ${placeholder || label ? `placeholder="${placeholder || label}"`: ''}>
      </mblock>`
    }

    case 'checkbox': {
      return `<mblock ${FORM_INPUT_SELECTOR}="${type}">
        <input id="${id}"
                type="${type}"
                name="${name}"
                ${disabled ? `disabled="true"`: ''}
                ${value ? `checked="true"`: ''}>
        <label for="${id}" ${CONTROL_LANG_SELECTOR}>${label}</label>
      </mblock>`
    }
  }
}

export const createSelectFileInput = ({ id, accepts, multiple }: SelectFileOptions ) => {
  return `<mblock ${FORM_INPUT_SELECTOR}="upload" style="display:none!important">
    <input id="${id}"
            type="file"
            multiple="${!!multiple}"
            accept="${accepts || '*'}">
  </mblock>`
}

export const createFormSeperator = ( options?: SeperatorOptions ) => {
  return `<mblock ${FORM_SEPERATOR_SELECTOR}></mblock>`
}

export const createListItem = ({ icon, title, value, event, sub, disabled }: ListItem ) => {
  let attrs = `${disabled ? 'class="disabled"' : ''}`
  
  // Trigger event type & params attributes
  if( event ){
    if( event.type && event.attr ) attrs += ` ${event.type}="${event.attr}"`
    if( event.params ) attrs += ` params="${event.params}"`
  }

  return `<mli ${attrs}>
    <micon class="${icon}"></micon>
    <minline ${CONTROL_LANG_SELECTOR}>${title}</minline>
    ${value ? `<minline class="value" ${CONTROL_LANG_SELECTOR}>${value}</minline>` : ''}

    ${sub ? `<minline class="sub-arrow"><micon class="bx bx-chevron-right"></micon></minline>` : ''}
  </mli>`
}