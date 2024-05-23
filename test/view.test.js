
// const { Auth } = require('../dist')

// describe('[AUTH]: Configurations -- [src/Auth.ts]', () => {
//   test('Should throw: No configuration error', () => {
//     expect( () => new Auth() ).toThrow(/^Undefined Credentials/)
//   })

//   test('Should throw configuration fields missing error', () => {
//     expect( () => new Auth({ workspace: 'abcd' }) )
//         .toThrow(/^Undefined Remote Origin/)
//   })

//   test('Should throw Error <Application Not Found>', async () => {
//     try {
//       const credentials = {
//         remoteOrigin: 'https://example.com',
//         workspace: 'abcd',
//         appId: '1234',
//         appSecret: '83buf...bh929'
//       }
      
//       auth = new Auth( credentials )
//       await auth.getToken()
//     }
//     catch( error ){ expect( error.message ).toBe('Application Not Found') }
//   })

//   test('Should throw Error <Invalid Request Origin>', async () => {
//     try {
//       const credentials = {
//         remoteOrigin: 'https://example.com',
//         workspace,
//         appId,
//         appSecret
//       }
      
//       auth = new Auth( credentials )
//       await auth.getToken()
//     }
//     catch( error ){ expect( error.message ).toBe('Invalid Request Origin') }
//   })
// })