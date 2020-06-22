/**
 *
 *
 * @author: Bernhard Lukassen
 */

export default async (opts) => {
    // if (!!thoregon.embedded) return;

    universe.logger.debug("service worker setup start");
    if ('serviceWorker' in navigator) {
        try {
            let registration;
            if (navigator.serviceWorker.controller) {
                universe.logger.debug("service worker exists");
                registration = navigator.serviceWorker.controller;
            } else {
                await navigator.serviceWorker.register('/universe-service.mjs');
                universe.logger.debug("service worker setup registered");
                registration = await navigator.serviceWorker.ready;
                // registration = await registration.update();
                // todo: reload page the hand over fetch control to the service worker --> https://developers.google.com/web/fundamentals/primers/service-workers/lifecycle
                //  otherwise the browser resumes with direct fetch until the user 'reloads'
            }

            navigator.serviceWorker.addEventListener("message", async event => {
                // let message = JSON.parse(event.data);
                universe.logger.debug("Message from ServiceWorker", event);
            });



/*  loading of scripts later than the install doesn't work. message posts do work
            if (registration.active) registration.active.postMessage({
                script: 'http://localhost:8070/lib/service-worker-plugin.mjs'
            });
*/
        } catch (e) {
            // todo: handle error properly
            universe.logger.debug('Service worker registration failed:', e);
        }
    } else {
        // browser loader on the server must fulfill all requests; no advanced functions like server push are available
    }
}
