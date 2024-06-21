import Component, { ComponentFactory } from '../modules/block.component'
import { signal } from '../modules/reactive'

type CountInput = {
  value: number
}

const factory: ComponentFactory<CountInput> = ({ value }) => {
  return `<span>${value} in ${getTime()}</span>`
}

export default ( input: CountInput ) => {
  const comp = new Component<CountInput>( factory, input )

  comp.setState()
}