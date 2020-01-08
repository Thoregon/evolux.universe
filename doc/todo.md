ToDo
====

- templates
    - custom title, ...
    - custom style sheets
    - enable custom 'index-html' (replace default template)
     
- introduce a service registry for the protouniverse to handle service instances before the serivce can be 'officially' installed.

- introduce a nameservice --> evolux.stellarmap

- enclose booted scrpt with its private processing context
    - --> nodeJS: require('vm2'); https://www.heise.de/developer/artikel/JavaScript-Code-dynamisch-zur-Laufzeit-laden-und-ausfuehren-4536862.html?seite=3
    - --> browser: https://github.com/dfkaye/vm-shim, https://github.com/commenthol/safer-eval#readme
    - no access to global variables except 'universe'

- Universe: catch 'unhandled exceptions' and do proper logging 
- migrate to 'thoregon.universe'?

- integrate [pnpm](https://github.com/pnpm/pnpm) / babel / rollup for package management

- ? do we need a "shadow" of the reliant client on the service side ?

- bootloader & browserloader
    - import { matter } from '/universe/evolux'; 
         --> dynamicInstantiate
    - check default params on universe
    - --> yarn: use a common local cache for npm/bower modules; try to utilise pnpm
    - do a correct version resolution for (sub)packages; currently it uses the first found
    - add middleware hooks to allow other software layers to plugin
    - use: mainFields: ['module', 'main'], instead of module: true, jsnext: true, main: true, browser: true,
        the fields to scan in a package.json to determine the entry point
        if this list contains "browser", overrides specified in "pkg.browser"
        will be used
    - wrapper/replacement for builtins which works on all platforms
    - --> get inspiration from https://www.npmjs.com/package/rollup-plugin-node-resolve
               
- browserloader
    - introduce ServiceWorker on client side
        - service worker    https://serviceworke.rs/
            - virtual server, local downloads, dependency injection, (immediate claim) --> dynlayers
        - cache APU         https://developers.google.com/web/fundamentals/instant-and-offline/web-storage/cache-api
        - background sync   https://developers.google.com/web/updates/2015/12/background-sync
        - push messages     https://developers.google.com/web/fundamentals/codelabs/push-notifications/, https://github.com/web-push-libs/web-push
    - introduce ETag to identify client
        - memorize client settings to deliver a matching module layer stack
    - introduce browser Application Cache (AppCache) manifest, also installable PWA's 
        - handle 'beforeinstallprompt' event to tell the user it is installable
        --> https://developer.mozilla.org/de/docs/Web/HTML/Using_the_application_cache
    - boot params
        - apply basic setings like 'stage' to the browserloader env
    - express
        - enable CORS (Cross-Origin Resource Sharing), server whitelisting
        - add WS (Websockets)
    - enable CSP (Content-Security-Policy) on client side
    - separate module types to segments(components)
    - same resolver for node and browser
    - support bower_modules
    - analyse 'npm' packages
        - which packager used (rollup, webpack), anlyse packager config, find or build the browser package
        - which packager used (rollup, webpack), anlyse packager config, find or build the browser package
        - analyse rollup.js which packages are available 
        - transpile modules using require() with babel and rollup 

    - later: thoregon browser extension

- watch changes of config's, reload
    --> own module, installable, for reliant and sovereign nodes

- just setup the base system to be able to process transations
    - setup components, layers, schemas ... with events from the event store
    
- introduce policies (permissions) for the global registry (universe)
    - component is the 'master' for a directory, others can only read
    - grant other components to update

Done
====

- bootloader 
    * introduce “global.window = global;”  add isReliant() [isBrowser] and isSovereign() [isNode] to global
    * search for modules, local 'node_modules', if not found start with 'parentModuleURL'

- bootloader & browserloader
    * use the leading '/' to find node_modules
    * use the leading '/' to find builtin modules

- browserloader: analyse 'npm' packages
    - 'main' component
        - include 'index.html' as <iframe> in boot html
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
