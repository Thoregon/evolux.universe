Loaders
=======

!! im browser require permissions from user: files system, push messages

## Loader hierarchy

higher level loaders are responsible to resolve the resource (location)
then find responsible low level loader, this gets the source
then wrap/translate source
ensure firewall rules
 

## Higher Level Loader
a generalized interface for component/module/class loading.

add code to define the scope (context) depending on the component
- redefine import(), rewrite relative 'import ... from "..."' to this component
- redefine other globals
    - indexDB, window, document, Worker, SharedWorker, ... (TBD)
- override all not redefined global with empty object
  
firewalling will be done in 'getSource'  

API:
- async resolve(specifier, context)
    specifier   ... the requested resource
    context     ... conditions, parentURL (referrer)
    return: { url: '...' } if resolved
    return: <undefined> if the loader is not responsible
    throw if responsible, but the resource can't be found, or on another error
- async getFormat(url, context)
    url         ... the resolved url
    context     ... conditions, parentURL (referrer)
    return { format: 'module' } \[one of 'builtin', 'commonjs', 'json', 'module', 'wasm' \] 
- async getSource(url, context)
    url         ... the resolved url
    context     ... format
    return: { source: source <string> | <SharedArrayBuffer> | <Uint8Arr | <ReadableStream | <AsyncIterator> }
- async transformSource(source, context)   
    source      ... the source of the module
    context     ... url, format
    return: { source: source <string> | <SharedArrayBuffer> | <Uint8Arr | <ReadableStream | <AsyncIterator> }
    

## Nodeloader

Implementation when running in NodeJS

## Browserloader

Runs in the service worker in the browser. This enables standalone apps w/o a server.
