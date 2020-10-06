/**
 * this is the service worker to keep in contact with the host service
 * - use websocket for truCloud
 * - use web background sync if available (chrome) for cached resources
 *
 * @author: blukassen
 */

// todo: let the ModuleResolver feed the script URLs. scripts cannot be loaded later on demand
//  e.g. in the 'message' handler

// importScripts(${scripts});

// todo [OPEN]: precache the thoregon system --> importScript()

const CACHE = 'THOREGON';

// console.log("Inside 'universe-service.mjs");

const precache = () => {

}

const fromNetwork = (request) => {
    /*
        if (request.url.indexOf('evolux.universe') > -1) {
            console.log('!! evolux.universe');
        }
        if (request.url.indexOf('common.mjs') > -1) {
            console.log(`!! common.mjs  ref: ${request.referrer}`);
        }
        return fetch(request);
        return new Promise(function (fulfill, reject) {
            fetch(request).then(function (response) {
                fulfill(response);
            })
            .catch(reject);
        });
    */
}

self.addEventListener('install', (event) => {
    console.log('>> The service worker is being installed.', event);
    self.skipWaiting();
    console.log('>> The service worker after skipWaiting().', event);
    event.waitUntil(precache());
});

self.addEventListener('activate', (event) => {
    console.log('>> The service worker is being activated.', event);
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
/*
    // matchAll() delivers all current connected client windows
    self.clients.matchAll().then(clients => {
        console.log(`§ clients: ${clients.length}`);
    });
*/
    // console.log(`> ${event.request.method} -> ${event.request.url}  referer: ${event.request.referrer}`);

    /*
        event.respondWith(fromNetwork(event.request));
    */
});

self.addEventListener('message', (event) => {
    // console.log('The service worker received a message.', event);
    const messageSource = event.source;
    const cmd           = event.data;

/* does not work!!
    if (cmd.script) {
        importScripts(cmd.script);
    }
*/

    messageSource.postMessage({ "ack": event.data });
/*
    event.waitUntil((async () => {
        const clients = await self.clients.matchAll();
        clients.forEach(client => client.postMessage("answer"));
    })());
*/
});

/*
 * Web Push Notifications
 */

self.addEventListener('push', function(event) {
    event.waitUntil(self.registration.showNotification('ServiceWorker Cookbook', {
        body: 'Push Notification Subscription Management'
    }));
});

self.addEventListener('pushsubscriptionchange', function(event) {
    console.log('Subscription expired');
    event.waitUntil(
        self.registration.pushManager.subscribe({ userVisibleOnly: true })
            .then(function(subscription) {
                // console.log('Subscribed after expiration', subscription.endpoint);
                return fetch('register', {
                    method: 'post',
                    headers: {
                        'Content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        endpoint: subscription.endpoint
                    })
                });
            })
    );
});
