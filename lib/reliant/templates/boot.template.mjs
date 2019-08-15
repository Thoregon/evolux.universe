/**
 *
 *
 * @author: blukassen
 */

// *** make 'global' global available. support 'browser' and 'node' modules to use 'global' or 'window' arbitrarily
// *** yes, this is not true, but since javascript modules automatically runs in strict mode, there is no way to test for 'global' or 'window' without an error
window.global = window;
// *** some test methods
Object.defineProperties(window, {
    'isBrowser' :   { value: true,  configurable: false, enumerable: true, writable: false},
    'isReliant' :   { value: true,  configurable: false, enumerable: true, writable: false},
    'isNode' :      { value: false, configurable: false, enumerable: true, writable: false},
    'isSovereign' : { value: false, configurable: false, enumerable: true, writable: false},
});

const clientparams = ${clientparams};

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
