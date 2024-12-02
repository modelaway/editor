import { Component } from '../../component/lips'
import {
  CONTROL_LANG_SELECTOR,
  CONTROL_TOOLBAR_SELECTOR,
  VIEW_CONTROL_OPTIONS
} from '../constants'

/**
 * Process toolbar options into HTML content
 */
export type ToolbarInput = {
  key: string
  options: ObjectType<ToolbarOption>
  settings?: ToolbarSettings
  position?: {
    left: string
    top: string
  }
}
export default ( input: ToolbarInput ) => {
  const factory = ({ key, options, settings, position }: ToolbarInput ) => {
    if( typeof options !== 'object' )
      throw new Error('Invalid Toolbar Arguments')

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

        return `<mli ${attrs} title="${title}" ${CONTROL_LANG_SELECTOR}><micon class="${icon}"></micon></mli>`
      }
    },
    composeLi = ([ attr, { icon, label, title, event, disabled, active, extra, sub, meta }]: [ attr: string, tset: ToolbarOption ]) => {
      let attrs = ''
      
      // Option has sub options
      if( sub && Object.keys( sub ).length ){
        attrs += ` show="sub-toolbar" params=key`

        // Create a sub options
        subOptions.push(`
                        <mblock options="sub" extends=key>
                          <mli dismiss="sub-toolbar" title="Back" ${CONTROL_LANG_SELECTOR}><micon class="bx bx-chevron-left"></micon></mli>
                          <mli class="label"><micon class=each.icon></micon><mlabel ${CONTROL_LANG_SELECTOR} text="each.label || each.icon.title"></mlabel></mli>
                          
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

      const optionLi = `<mli ${attrs} ${CONTROL_LANG_SELECTOR}><micon class="${icon}"></micon>${label ? `<mlabel ${CONTROL_LANG_SELECTOR}>${label}</mlabel>` : ''}</mli>`
      extra ?
        extraOptions += optionLi
        : mainOptions += optionLi
    }
    
    /**
     * Attach meta options to every editable view.
     */
    const 
    metaOptions: ObjectType<ToolbarOption> = {},
    detachedOptions: ObjectType<ToolbarOption> = {},
    isVisible = ([ key, option ]: [string, ToolbarOption]) => (!option.hidden)

    Object
    .entries( VIEW_CONTROL_OPTIONS )
    .filter( isVisible )
    .map( ([attr, option]) => {
      if( option.meta ) metaOptions[ attr ] = option
      if( settings?.detached && option.detached ) detachedOptions[ attr ] = option
    } )

    if( settings.editing && Object.keys( metaOptions ).length )
      options = { ...options, ...metaOptions }

    // Generate HTML menu
    Object
    .entries( options )
    .filter( isVisible )
    .map( composeLi )

    // if( !mainOptions )
    //   throw new Error('Undefined main options')

    // let optionalAttrs = ''
    // if( settings.editing ) 
    //   optionalAttrs += ' class="editing"'
    
    // if( typeof position == 'object' )
    //   optionalAttrs += ` style="left:${position.left};top:${position.top};"`

    return `<mblock ${CONTROL_TOOLBAR_SELECTOR}="${key}"
                    class="input.settings.editing ? 'editing' : '?'"
                    style="typeof input.position == 'object' ? { left: input.position.left, top: input.position.top } : '?'">
      <mblock container>
        <mul>
          <let options="Object.values( input.options ).filter( option => (!option.hidden))"></let>
          <let prime_options="options.filter( option => (!option.extra) )"></let>
          <let extra_options="options.filter( option => (option.extra))"></let>
          <let sub_options="options.filter( option => (option.sub))"></let>

          <mblock options="main">
            <for in=prime_options>
              <mli meta="!each.meta && '?'"
                    active="!each.active && '?'"
                    class="each.label ? 'label' : '?'"
                    title="each.title ? each.title : '?'"
                    disable="!each.disabled && '?'"
                    ${CONTROL_LANG_SELECTOR}>
                <micon class="each.icon"></micon>
                <if( each.label )>
                  <mlabel ${CONTROL_LANG_SELECTOR} text=each.label></mlabel>
                </if>
              </mli>
            </for>

            <if( extra_options.length )>
              <mli show="extra-toolbar" title="Extra options" ${CONTROL_LANG_SELECTOR}><micon class="bx bx-dots-horizontal-rounded"></micon></mli>
            </if>
          </mblock>

          <if( extra_options.length )>
            <mblock options="extra">
              <for in=extra_options>
                <mli meta="!each.meta && '?'"
                      active="!each.active && '?'"
                      class="each.label ? 'label' : '?'"
                      title="each.title ? each.title : '?'"
                      disable="!each.disabled && '?'"
                      ${CONTROL_LANG_SELECTOR}>
                  <micon class=each.icon></micon>
                  <if( each.label )>
                    <mlabel ${CONTROL_LANG_SELECTOR} text=each.label></mlabel>
                  </if>
                </mli>
              </for>
              <mli dismiss="extra-toolbar" title="Back" ${CONTROL_LANG_SELECTOR}><micon class="bx bx-chevron-left"></micon></mli>
            </mblock>
          </if>

          <if( sub_options.length )>
            <for in="Object.entries( input.options ).filter( ([key, option]) => (option.sub))">
              <mblock options="sub" extends="each[0]">
                <mli dismiss="sub-toolbar" title="Back" ${CONTROL_LANG_SELECTOR}>
                  <micon class="bx bx-chevron-left"></micon>
                </mli>
                <mli class="label">
                  <micon class=each[1].icon></micon>
                  <mlabel ${CONTROL_LANG_SELECTOR} text="each[1].label || each[1].title"></mlabel>
                </mli>
                
                <for in=each[1].sub>
                  <mli active="!each.active && '?'"
                      disable="!each.disabled && '?'"
                      title="each.title ? each.title : '?'"
                      ${CONTROL_LANG_SELECTOR}>
                    <micon class=each.icon></micon>
                  </mli>
                </for>
              </mblock>
            </for>
          </if>
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

  return new Component<ToolbarInput>('toolbar', factory( input ), { input })
}
