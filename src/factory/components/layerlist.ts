
type LayerListInput = LayerElement & {
  layer: string
  path: string
  depth: number
}

const LayerList = () => {
  const template = `
    <const layer="input.depth === 0 ? '#' : input.layer"
            path="input.depth === 0 ? '#' : input.path +'.layers'"></const>

    <mul sortable
          layer=layer
          path=path
          style="{ display: input.collapsed ? 'block' : 'none' }">
      <for in=input.list>
        <layeritem ...each
                    path=path
                    depth=input.depth></layeritem>
      </for>
    </mul>
  `

  return { default: template }
}

export default LayerList