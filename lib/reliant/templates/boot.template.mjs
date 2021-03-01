/**
 *
 *
 * @author: blukassen
 */

const clientparams = ${clientparams};


/*
    clientparams: recognise kind of peer/client
    - nature: sovereign
        - density: headless
        - density: headed
    - nature: reliant
        - density: lite
        - density: rich

   yes, this can be faked by the peer but it does not matter because the peers can decide themselves what thy are
   it is not of interest for the loader
 */

const thoregon = {};
// *** some test methods
Object.defineProperties(thoregon, {
    'ui':           { value: true,                      configurable: false, enumerable: true, writable: false},
    'isBrowser' :   { value: true,                      configurable: false, enumerable: true, writable: false },
    'isReliant' :   { value: true,                      configurable: false, enumerable: true, writable: false },
    'isNode' :      { value: false,                     configurable: false, enumerable: true, writable: false },
    'isSovereign' : { value: false,                     configurable: false, enumerable: true, writable: false },
    'nature' :      { value: clientparams.nature,       configurable: false, enumerable: true, writable: false },
    'density' :     { value: clientparams.density,      configurable: false, enumerable: true, writable: false },
    'embedded':     { value: !!clientparams.embedded,   configurable: false, enumerable: true, writable: false },
    // todo [OPEN]: autoselect other themes like iOS, get user selected theme from 'localStorage'
    'uitheme' :     { value: 'material',                configurable: false, enumerable: true, writable: false },
});

/*
 * check if loaded embedded in another site
 */

let m = import.meta;

let lorigin = new URL(window.location.href).origin;
let morigin = new URL(m.url).origin;
if (lorigin !== morigin) {
    Object.defineProperty(thoregon, 'delivery', { value: morigin, configurable: false, enumerable: true, writable: false});
}

// todo: encapsulate with its own processing context (vm-shim);
//       replace global variables with mockups to allow checks for existence in strict mode

/*
 * defines some global properties
 */
const properties = {
    'thoregon' :    { value: thoregon,                  configurable: false, enumerable: true, writable: false },
    // *** define also the 'process' as global variable that it can be tested
    // 'process' :     { value: { env: {} },                  configurable: false, enumerable: true, writable: false },
};

if (!window.globalThis) properties.globalThis = { value: window, configurable: false, enumerable: true, writable: false};

Object.defineProperties(window, properties);

/*
 * feature detect if browser supports webcomponents, otherwise polyfill it
 */
if (!window.customElements) {
    let script = document.createElement('script');
    script.setAttribute("src", "/evolux.universe/@webcomponents");
    if (document.body) document.body.appendChild(script);
}


/*
 * now load the app boot script,
 * register the universe service worker
 */
(async () => {
    try {
        // install the serviceworker; do this immed, because the serviceworker acts as thoregon loader
        // console.log('before thoregon loader setup');
        let thoregonLoaderSetup = await import('/thoregonloader-setup');
        // console.log('after thoregon loader setup');
        await thoregonLoaderSetup.default();

        await import("./${index}");
    } catch (err) {
        console.log(err);
    }
})();
