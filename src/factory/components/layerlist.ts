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

  const stylesheet = `
    --td: 150ms;
    --go: .9;
    --pb: var(--me-primary-color-transparent);
    --sb: rgba(65,145,255,.5);
    --hb: var(--me-primary-color);

    .mli[sortable] {
      transition: all var(--td) ease;
      transform-origin: 50% 50%;
      animation: reorder var(--td) ease;

      /* 
      &:hover {
        background: var(--hb);
        .nested-indicator { opacity: 1 }
      } */
      
      &[level] .nested-indicator {
        position: absolute;
        left: -12px;
        width: 2px;
        height: 100%;
        background: var(--sb);
        opacity: 0;
        transition: opacity var(--td) ease;
      }
    }

    .sortable-handle {
      cursor: grab;
      &:active { cursor: grabbing }
    }

    .sortable-placeholder {
      position: relative;
      z-index: 1;
      height: 5px;
      margin: 4px 0;
      border-radius: 2px;
      background: var(--hb);
      transition: all var(--td) ease;
      pointer-events: none;
    }

    .sortable-drag { opacity: 0; }
    .sortable-group-drop {
      background-color: var(--me-primary-color-fade);
      border-left: 3px solid var(--me-primary-color);
      transition: all var(--td) ease;
    }

    .selected {
      border-left: 3px solid var(--hb);
    }
    .level-change {
      animation: level-shift var(--td) ease;
    }
  `

  return { default: template, stylesheet }
}

export default LayerList