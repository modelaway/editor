
export const context = ['getUser']

export const stylesheet = `
  * { font-family: helvetica }
`

export default `
<async await="this.context.getUser, 'Peter Giligous'">
  <preload>Preloading...</preload>
  <resolve>
    <ul style="{ border: '1px solid black', padding: '15px' }">
      <li text=this.async.response.name></li>
      <li text=this.async.response.email></li>
    </ul>

    <component ref="counter" initial=5>By:</component>
  </resolve>
  <catch><span text=this.async.error></span></catch>
</async>
`