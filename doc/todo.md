ToDo
====

- migrate to 'thoregon.universe'!

- integrate yarn/babel/rollup for package management

- ? do we need a "shadow" of the reliant client on the service side ?

- bootloader & browserloader
    * check default params on universe
    * --> yarn: use a common local cache for npm/bower modules
    * add middelware hooks to allow other software layers to plugin
    
- browserloader
    * introduce ETag to identify client
        * memorize client settings to deliver a matching module layer stack
    * introduce browser cache manifest
    * boot params
        * apply basic setings like 'stage' to the browserloader env
    * express
        * enable CORS (Cross-Origin Resource Sharing), server whitelisting
        * add WS (Websockets)
    * enable CSP (Content-Security-Policy) on client side
    * support bower_modules
    * analyse 'npm' packages
        * which packager used (rollup, webpack), anlyse packager config, find or build the browser package
        * which packager used (rollup, webpack), anlyse packager config, find or build the browser package
        * analyse rollup.js which packages are available 
        * transpile modules using require() with babel and rollup 

- watch changes of config's, reload
    --> own module, installable, for reliant and sovereign nodes

Done
====

- bootloader 
    * introduce “global.window = global;”  add isReliant() [isBrowser] and isSovereign() [isNode] to global
    * search for modules, local 'node_modules', if not found start with 'parentModuleURL'

- bootloader & browserloader
    * use the leading '/' to find node_modules
    * use the leading '/' to find builtin modules

- browserloader: analyse 'npm' packages
    * ensure cache directory
    * params
        * use params from ./boot?... request
    * package.json: if exists "jsnext:main" use it
    * featuredetect webcomponents add load polyfill only when needed
        * add polyfill for webcomponents
    * include express
        * add express params
        * include cors
    * indexrequest -> send container html with script imports
    * supply a generated 'boot-mjs', reference to 'index' by query param, apply other query params to the universe like 'setup.mjs' does.
    * analyse 'npm' packages
            * maintain cache 
            * check 'bower.json'
            * wrap “browser” scripts in package.json with a ‘fake’ AMD function
            * analyse “main” and “type” (module), if no type best guess for the file extension (.js | .mjs)
            * analyse the “browser” field, apply file name replacements	
                https://github.com/defunctzombie/package-browser-field-spec
                https://github.com/dtao/lazy.js/blob/master/lazy.js
    * modulewrapper for ES6 modules
    
        function isFunction(obj) {
          return !!(obj && obj.constructor && obj.call && obj.apply);
        };
        
        let module = {};
        function define(p1, p2) {
            module = isFunction(p1)  ? p1() : !!p2 ? p2() : {};
        }
        define.amd = true;
        
        … insert script here
        
        export default module;
                OR
        const module = { exports: {} };
        let exports = module.exports;
        
        … insert script here
        
        export default module.exports;
