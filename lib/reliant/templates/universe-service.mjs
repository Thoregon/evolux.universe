/**
 * this is the service worker to keep in contact with the host service
 * - use websocket for truCloud
 * - use web background sync if available (chrome) for cached resources
 *
 * @author: blukassen
 */

// todo: let the ModuleResolver feed the script URLs. scripts cannot be loaded later on demand
// importScripts(${scripts});

const CACHE = 'THOREGON';

// console.log("Inside 'universe-service.mjs");

function fromNetwork(request) {
    return new Promise(function (fulfill, reject) {
        fetch(request).then(function (response) {
            fulfill(response);
        })
        .catch(reject);
    });
}

self.addEventListener('install', (event) => {
    // console.log('The service worker is being installed.', event);
    event.waitUntil(async () => {});
});

self.addEventListener('activate', (event) => {
    // console.log('The service worker is being activated.', event);
    event.waitUntil(async () => {});
});

/*
self.addEventListener('fetch', (event) => {
    // console.log('The service worker is requested to fetch.', event);
    let req = event.request;
    console.log(`R: ${req.referrer}, U: ${req.url}`);
    event.respondWith(fromNetwork(req));
});
*/

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
