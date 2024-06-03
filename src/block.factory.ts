import type { ViewCaption } from './types/view'
import {
  VIEW_REF_SELECTOR,
  VIEW_CONTROL_OPTIONS,
  VIEW_PLACEHOLDER_SELECTOR,

  CONTROL_PANEL_SELECTOR,
  CONTROL_TOOLBAR_SELECTOR,
  CONTROL_DISCRET_SELECTOR,
  CONTROL_FLOATING_SELECTOR,

  GLOBAL_CONTROL_OPTIONS,

  FORM_INPUT_SELECTOR,
  FORM_SEPERATOR_SELECTOR,
} from './constants'
import { generateKey } from './utils'

/**
 * UI blocks factory
 */
export const createGlobalControlBlock = () => {
  const globalTabs = `<mul options="tabs">
    <mli show="global" target="settings"><micon class="bx bx-cog"></micon></mli>
    <mli show="global" target="styles"><micon class="bx bxs-brush"></micon></mli>
    <mli show="global" target="assets"><micon class="bx bx-landscape"></micon></mli>
    <mli dismiss="global"><micon class="bx bx-x"></micon></mli>
  </mul>`,
  globalBody = `<mblock>

  </mblock>`
  
  return `<mblock class="modela-global">
    ${createToolbar('global', GLOBAL_CONTROL_OPTIONS )}
    
    <mblock mv-control-block="global">
      ${globalTabs}
      ${globalBody}
    </mblock>
  </mblock>`
}
export const createStoreControlBlock = () => {
  const
    storeBlock = `<mblock mv-control-block="store">
    </mblock>`
    
    /**
     * 
     */
    return `<mblock class="modela-store">
      <span show="store"><micon class="bx bx-dots-vertical-rounded"></micon></span>

      ${storeBlock}
    </mblock>`
}
export const createControlLayer = () => {
  return `<div id="modela">
    ${createStoreControlBlock()}
    ${createGlobalControlBlock()}
  </div>`
}

/**
 * Process toolbar options into HTML content
 */
export const createToolbar = ( key: string, options: ObjectType<ToolbarOption> = {}, settings?: ToolbarSettings ) => {
  if( typeof options !== 'object' )
    throw new Error('Invalid createToolbar Arguments')
  
  // Apply settings
  settings = {
    editing: false,
    detached: false,
    ...settings
  }

  let 
  mainOptions = '',
  extraOptions = '',
  subOptions: string[] = []

  const
  composeSubLi = ( parentAttr?: string ) => {
    return ([ attr, { icon, title, event, disabled, active }]: [ attr: string, tset: ToolbarOption ] ) => {
      let attrs = ''
      
      // Trigger event type & params attributes
      if( event ){
        if( event.type && attr ) attrs += ` ${event.type}="${parentAttr ? `${parentAttr}.` : ''}${attr}"`
        if( event.params ) attrs += ` params="${event.params}"`
      }

      // Add title attributes
      if( active ) attrs += ` active`
      if( disabled ) attrs += ` disabled`
      if( title ) attrs += ` title="${title}"`

      return `<mli ${attrs}><micon class="${icon}"></micon></mli>`
    }
  },
  composeLi = ([ attr, { icon, label, title, event, disabled, active, extra, sub, meta }]: [ attr: string, tset: ToolbarOption ]) => {
    let attrs = ''
    
    // Option has sub options
    if( sub && Object.keys( sub ).length ){
      attrs += ` show="sub-toolbar" params="${attr}"`

      // Create a sub options
      subOptions.push(`<mblock options="sub" extends="${attr}">
                        <mli dismiss="sub-toolbar"><micon class="bx bx-chevron-left"></micon></mli>
                        <mli class="label"><micon class="${icon}"></micon><mlabel>${label || title}</mlabel></mli>
                        ${Object.entries( sub ).map( composeSubLi( attr ) ).join('')}
                      </mblock>`)
    }

    // Trigger event type & params attributes
    else if( event ){
      if( event.type && attr ) attrs += ` ${event.type}="${attr}"`
      if( event.params ) attrs += ` params="${event.params}"`
    }

    // Add title attributes
    if( meta ) attrs += ` meta`
    if( active ) attrs += ` active`
    if( disabled ) attrs += ` disabled`
    if( label ) attrs += ` class="label"`
    if( title ) attrs += ` title="${title}"`

    const optionLi = `<mli ${attrs}><micon class="${icon}"></micon><mlabel>${label ? ` ${label}` : ''}</mlabel></mli>`
    extra ?
      extraOptions += optionLi
      : mainOptions += optionLi
  }
  
  /**
   * Attach meta options to every editable view.
   */
  const 
  metaOptions: ObjectType<ToolbarOption> = {},
  detachedOptions: ObjectType<ToolbarOption> = {}

  Object.entries( VIEW_CONTROL_OPTIONS ).map( ([attr, option]) => {
    if( option.meta ) metaOptions[ attr ] = option
    if( settings.detached && option.detached ) detachedOptions[ attr ] = option
  } )

  if( settings.editing && Object.keys( metaOptions ).length )
    options = { ...options, ...metaOptions }

  // Generate HTML menu
  Object.entries( options ).map( composeLi )

  if( !mainOptions )
    throw new Error('Undefined main options')

  return `<mblock ${CONTROL_TOOLBAR_SELECTOR}="${key}" ${settings.editing ? 'class="editing"' : ''}>
    <mblock container>
      <mul>
        <mblock options="main">
          ${mainOptions}
          ${extraOptions ? `<mli show="extra-toolbar"><micon class="bx bx-dots-horizontal-rounded"></micon></mli>` : ''}
        </mblock>

        ${extraOptions ?
              `<mblock options="extra">
                ${extraOptions}
                <mli dismiss="extra-toolbar"><micon class="bx bx-chevron-left"></micon></mli>
              </mblock>` : ''}

        ${subOptions.length ? subOptions.join('') : ''}
      </mul>

      ${Object.keys( detachedOptions ).length ? 
            `<mul>
              <mblock options="control">
                ${Object.entries( detachedOptions ).map( composeSubLi() ).join('')}
              </mblock>
            </mul>`: ''}
    </mblock>
  </mblock>`
}

export const createPanel = ( key: string, caption: ViewCaption, options: PanelSections, active?: string ) => {
  if( typeof options !== 'object' )
    throw new Error('Invalid createPanel options')

  let
  sectionTabs = '',
  sectionBodies = ''

  const composeSection = ( name: string, { icon, fieldsets, listsets }: PanelSection, isActive: boolean ) => {
    /**
     * List of tabs
     */
    sectionTabs += `<mli tab="${name}" ${isActive ? 'class="active"' : ''}><micon class="${icon}"></micon></mli>`

    let fieldsetHTML = ''
    fieldsets?.map( ({ label, fields, seperate }) => {
      // Do not render empty fieldset
      if( !Array.isArray( fields ) || !fields.length )
        return
      
      fieldsetHTML += `<fieldset>
        ${label ? `<mlabel>${label}</mlabel>` : ''}
        ${fields.map( each => (createInput( each )) ).join('')}
      </fieldset>`

      // Add seperator to this block
      if( seperate )
        fieldsetHTML += createFormSeperator()
    } )

    let listsetHTML = ''
    listsets?.map( ({ label, items, seperate }) => {
      // Do not render empty list
      if( !Array.isArray( items ) || !items.length )
        return
      
      listsetHTML += `<mblock class="listset">
        ${label ? `<mlabel>${label}</mlabel>` : ''}
        <mul>${items.map( each => (createListItem( each )) ).join('')}</mul>
      </mblock>`

      // Add seperator to this block
      if( seperate )
        listsetHTML += createFormSeperator()
    } )

    sectionBodies += `<mblock section="attributes" class="active">
      <mblock>${fieldsetHTML}</mblock>
      <mblock>${listsetHTML}</mblock>
    </mblock>`
  }

  /**
   * Generate HTML content of panel sections
   */
  Object.entries( options ).map( ( [name, section], index ) => composeSection( name, section, active == name || index === 0) )

  return `<mblock ${CONTROL_PANEL_SELECTOR}="${key}">
    <mblock dismiss="panel" backdrop></mblock>
    <mblock container>
      <mblock class="header">
        <mblock>
          <micon class="${caption.icon}"></micon>
          <mlabel>${caption.title}</mlabel>

          <!-- Dismiss control panel -->
          <span dismiss="panel"><micon class="bx bx-x"></micon></span>
        </mblock>

        <mul options="tabs">${sectionTabs}</mul>
      </mblock>

      <mblock class="body">${sectionBodies}</mblock>
    </mblock>
  </mblock>`
}

export const createFloating = ( key: string, type: 'view' | 'layout', triggers: string[], update = false ) => {
  if( !Array.isArray( triggers ) || !triggers.length )
    throw new Error('Undefined triggers list')

  let list = ''
  triggers.map( each => {
    switch( each ){
      case 'addpoint': list += `<mli show="finder" params="${type}"><micon class="bx bx-plus"></micon></mli>`; break
      case 'paste': list += `<mli action="paste" params="${type}"><micon class="bx bx-paste"></micon></mli>`; break
    }
  } )

  return update ? `<mul>${list}</mul>` : `<mblock ${CONTROL_FLOATING_SELECTOR}="${key}"><mul>${list}</mul></mblock>`
}

export const createDiscretAddpoint = ( key: string ) => {
  return `<mblock ${CONTROL_DISCRET_SELECTOR}="${key}"><micon show="finder" params="view" class="bx bx-plus"></micon></mblock>`
}

/**
 * Create common placeholder block
 */
export const createPlaceholder = ( key?: string ) => {
  return `<mblock ${VIEW_PLACEHOLDER_SELECTOR}="${generateKey()}" ${VIEW_REF_SELECTOR}="${key}" status="active"></mblock>`
}

export const createInput = ({ type, label, name, value, pattern, placeholder, autofocus, options, range, disabled }: InputOptions ) => {

  const id = `input-${type}-${(label || name).toLowerCase().replace(/\s+/, '-')}`

  switch( type ){
    case 'text':
    case 'search': {
      return `<mblock ${FORM_INPUT_SELECTOR}="${type}">
        <!--<mlabel for="${id}">${label}</mlabel>-->
        <input id="${id}"
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
        <label for="${id}">${label}</label>
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
    <span>${title}</span>
    ${value ? `<span class="value">${value}</span>` : ''}

    ${sub ? `<span class="sub-arrow"><micon class="bx bx-chevron-right"></micon></span>` : ''}
  </mli>`
}

export const createSearchResult = ( list: ObjectType<Listset> ) => {
  let listsetHTML = ''
  
  /**
   * Generate HTML content of panel sections
   */
  Object.values( list ).map( ({ label, items, seperate }: Listset ) => {
    // Do not render empty list
    if( !Array.isArray( items ) || !items.length )
      return
    
    listsetHTML += `<mblock class="listset">
      ${label ? `<mlabel>${label.replace(/-/g, ' ').toCapitalCase()}</mlabel>` : ''}
      <mul>${items.map( each => (createListItem( each )) ).join('')}</mul>
    </mblock>`

    // Add seperator to this block
    if( seperate )
      listsetHTML += createFormSeperator()
  } )

  return listsetHTML || '<mblock mv-empty>No result</mblock>'
}

export const createFinderPanel = ( key: string, list: ObjectType<Listset> ) => {
  if( !key || !list )
    throw new Error('Invalid createAddViewBlock options')

  return `<mblock ${CONTROL_PANEL_SELECTOR}="${key}">
    <mblock dismiss="panel" backdrop></mblock>
    <mblock container>
      <mblock class="header">
        <mblock>
          <minline>Add view</minline>

          <!-- Dismiss control panel -->
          <minline dismiss="panel"><micon class="bx bx-x"></micon></minline>
        </mblock>

        ${createInput({
          type: 'search',
          name: 'search',
          placeholder: 'Search view'
        })}
      </mblock>

      <mblock class="results">
        ${createSearchResult( list )}
      </mblock>
    </mblock>
  </mblock>`
}