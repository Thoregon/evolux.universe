/**
 *
 *
 * @author: blukassen
 */

// *** make 'global' global available. support 'browser' and 'node' modules to use 'global' or 'window' arbitrarily
window.global = window;
// *** some test methods
window.isBrowser    = () => true;
window.isReliant    = () => true;
window.isNode       = () => false;
window.isSovereign  = () => false;

let clientsettings = {
    webcomponents:  !!window.customElements,
};

/*
 * feature detect if browser supports webcomponents, otherwise polyfill it
 */
if (!clientsettings.webcomponents) {
    let script = document.createElement('script');
    script.setAttribute("src", "/evolux.universe/@webcomponents");
    if (document.body) document.body.appendChild(script);
}

/*
 * now load the app boot script
 */
(async () => {
    try {
        await import("./${index}?client=" + encodeURI(JSON.stringify(clientsettings)));
    } catch (err) {
        console.log(err);
    }
})();
