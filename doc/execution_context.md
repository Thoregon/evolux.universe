Execution Context
=================

realistically, different contexts for components/modules can only be done with Workers.  

environment setup with contexts 'globals'
- universe, me, app, service, ...

communication between components with
- (window).post()
- Atomics and SharedArrays
- @see partydown

## Partydown

[Partydown](https://partytown.builder.io/how-does-partytown-work)

- https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Synchronous_and_Asynchronous_Requests
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer
- https://en.wikipedia.org/wiki/Serialization

## Links

### Workers

- https://nodejs.org/api/worker_threads.html
- https://stackoverflow.com/questions/65202700/how-to-modify-global-variable-from-worker-thread-in-nodejs

### VM (node module)

- https://github.com/snanovskyi/vm-browser
- https://nodejs.org/api/vm.html

### Async Hooks & Thread Local

- https://tabu-craig.medium.com/nodejs-and-thread-local-storage-eb2c1a24881
- https://github.com/watson/talks/tree/a30dbf599a61dfe820b293680b89815be9f16615/2016/06%20NodeConf%20Oslo 

### Context

- https://www.freecodecamp.org/news/execution-context-how-javascript-works-behind-the-scenes/
- https://www.npmjs.com/package/node-execution-context

#### Closures

- https://stackoverflow.com/questions/35649998/is-it-possible-to-have-thread-local-variables-in-node
