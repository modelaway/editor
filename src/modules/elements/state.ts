
export type Delta = {
  key: string
  vpk?: string  // Virtual Parent Key (VPK) for grouping
  type: string
  name: string
  tagname: string
  attributes?: Record<string, any>
  style: CSSProperties
  constraints: {            // For layout conversion
    alignsWith?: string[]   // IDs of elements it aligns with
    containedBy?: string    // ID of visual container
    spacing?: {             // Distance to nearby elements
      top?: number
      right?: number
      bottom?: number
      left?: number
    }
  }
  position?: {
    x: number
    y: number
    z: number
  }
  hidden?: boolean
  locked?: boolean
  content?: string
  styles?: string | null
  component?: {
    name: string
    rel: string
  }
}

export default class State {
  private delta: Partial<Delta> = {}

  set( field: keyof Delta, value: any ){
    this.delta[ field ] = value

    // Call lifecyle event functions
  }
  get( field?: keyof Delta ){
    return field ? this.delta[ field ] : this.delta 
  }
  delete( field: keyof Delta ){
    delete this.delta[ field ]

    // Call lifecyle event functions
  }
  reset(){
    this.delta = {}

    // Call lifecyle event functions
  }
  json(){
    return JSON.parse( JSON.stringify( this.delta ) )
  }
}