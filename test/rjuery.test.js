

const $$ = RJInit( this.chn )

const 
$$code = await $$('<code>ln(x) + 12</code>'),
$$box = await $$('#box')

// await $$('#box').addClass('rounded')
// console.log('-- hasClass: ', await $$('button').hasClass('btn') )
// const $clone = await $box.clone()
// ;(await $clone.addClass('rounded')).insertBefore('button')

// console.log( await $clone.attr('mv-name') )
// await $clone.attr('mv-key', '123456789999')
// await $clone.css('height', '400px')
// await $clone.css({ 'background-color': 'red' })

// console.log( await $clone.css('background-color') )

// ;(await $box.addClass('shadow')).append( $$code )
// console.log('-- is box: ', await $clone.is('div#box') )

// $$box.on('click', $$this => $$this.css('background-color', 'green') )

// console.log('length -- ', $$box.length )
// setTimeout( () => $$box.off('click'), 5000 )

// const $$editor = await $$('.editor')
// $$editor.on('mouseover', '.view', $$this => $$this.css('color', 'red') )

// console.log('-- text:', await (await (await $$editor.children()).first()).text() )
// console.log('-- paragraph:', await (await (await $$editor.children()).eq(2)).text() )
// console.log('-- img:', await (await $$editor.find('img')).attr('src') )

// ;(await $$editor.children()).each( async $$this => console.log('-- ', await $$this.text() ) )