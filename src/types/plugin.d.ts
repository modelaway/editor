
export interface Plugin {
  name: string
  version: string

  new( flux: Modela, config?: ObjectType<any> ): Plugin
  discard: () => void
}