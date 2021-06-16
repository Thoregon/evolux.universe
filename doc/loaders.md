Loaders
=======

!! im browser require permissions from user: files system, push messages

## resolving 

- builtin
    - node only, get builtin modules like fs, path, process, ...
    - provide essential modules like path also for browser, use e.g. from browserify reimplementations 
    
- universe
    - import an object/value from the universe
    - import will wait until the object exists
    - supports timeout for not found

- thoregon
    - basic environment information

- global
    - inmport object/value from global, 

- @components
    - deprecated, reference components via repository
    - add a 'components.mjs' at the root of a node app and specifiy a mappiing to used components
    - the modules in the 'components' folder will be mapped automatically

- data: urls
    - standard resolve in browser
    - check for node -> https://nodejs.org/api/esm.html#esm_data_imports

- node_modules
    - node only, support node standard
        - use only for infrastructure e.g. express, greenlock, ...
    - no browser substitute

- dorifer/repo
    - resolve import specifier to the required version
        - component descriptor specifies repo and components dependencies
    - SSI always have control over used/referenced components and versions
        - user can use different components/versions on each device 
    - components can be redirected by users to replacements
    - content in IPFS 
    - service agent also have repo mappings and a device 
    - node: resolve to the required components version URL
    - browser: redirect to the required components version URL

- Vault
    - needs user interaction
    - async encryption SSI and service agent 

- tdev
    - directory mappings
    - additional version mappings

Boot
- first from filesystem (IPFS) for boot
- later fetch updates from dorifer/repo

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
  
## Firewall

firewalling will be done in 'getSource'  
  

## Nodeloader

Implementation when running in NodeJS

## Browserloader

Runs in the service worker in the browser. This enables standalone apps w/o a server.
