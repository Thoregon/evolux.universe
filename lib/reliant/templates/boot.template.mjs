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
    'isBrowser' :   { value: true,                  configurable: false, enumerable: true, writable: false },
    'isReliant' :   { value: true,                  configurable: false, enumerable: true, writable: false },
    'isNode' :      { value: false,                 configurable: false, enumerable: true, writable: false },
    'isSovereign' : { value: false,                 configurable: false, enumerable: true, writable: false },
    'nature' :      { value: clientparams.nature,   configurable: false, enumerable: true, writable: false },
    'density' :     { value: clientparams.density,  configurable: false, enumerable: true, writable: false },
});

// todo: encapsulate with its own processing context (vm-shim);
//       replace global variables with mockups to allow checks for existence in strict mode

Object.defineProperties(window, {
    'thoregon' :    { value: thoregon,              configurable: false, enumerable: true, writable: false },
// *** make 'global' global available. support 'browser' and 'node' modules to use 'global' or 'window' arbitrarily
// *** yes, this is not true, but since javascript modules automatically runs in strict mode, there is no way to test for 'global' or 'window' without an error
    'global' :      { value: window,                configurable: false, enumerable: true, writable: false },
// *** define also the 'process' as global variable that it can be tested
    'process' :     { value: null,                  configurable: false, enumerable: true, writable: false },
});

/*
 * feature detect if browser supports webcomponents, otherwise polyfill it
 */
if (!window.customElements) {
    let script = document.createElement('script');
    script.setAttribute("src", "/evolux.universe/@webcomponents");
    if (document.body) document.body.appendChild(script);
}

/*
 * now load the app boot script
 */
(async () => {
    try {
        await import("./${index}");
    } catch (err) {
        console.log(err);
    }
})();
