/**
 * This is a wrapper to the indexedDB
 * simplified to a eays access key/value store
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import { timeout }     from "../thoregonhelper.mjs";

const wait4 = (conditionfn) => {
    return new Promise(async (resolve) => {
        while (!conditionfn()) await timeout(100);
        resolve();
    });
}

class BaseDB {

    async _init() {
        const base = this;
        return new Promise((resolve, reject) => {
            const openDB = indexedDB.open("thoregon", 1);
            openDB.onupgradeneeded = (ev) => {
                const db = ev.target.result;
                db.createObjectStore("thoregon", { keyPath: 'id' });
            };
            openDB.onsuccess = (ev) => {
                base.db = ev.target.result;
                resolve(base.db);
            }
            openDB.onerror = (ev) => {
                this.error = ev.target.errorCode;
                reject(ev);
            };
        });
    }

    get isReadyOrError() {
        return !!this.db || !!this.error;
    }

    async get(key) {
        return new Promise(async (resolve, reject) => {
            await wait4(() => this.isReadyOrError);
            if (this.error) {
                reject(this.error);
                return;
            }
            const request     = this.db
                                    .transaction('thoregon')
                                    .objectStore('thoregon')
                                    .get(key);
            request.onerror   = reject;
            request.onsuccess = (ev) => {
                resolve(request.result ? request.result.payload : undefined);
            };
        });
    }

    async set(key, value) {
        return new Promise(async (resolve, reject) => {
            await wait4(() => this.isReadyOrError);
            if (this.error) {
                reject(this.error);
                return;
            }
            const transaction = this.db.transaction('thoregon', 'readwrite');
            const store       = transaction.objectStore('thoregon');
            store.add({ id: key, payload: value });
            transaction.onerror    = reject;
            transaction.oncomplete = resolve;
        });
    }

    async del(key) {
        return new Promise(async (resolve, reject) => {
            await wait4(() => this.isReadyOrError);
            if (this.error) {
                reject(this.error);
                return;
            }
            const request     = this.db
                                    .transaction('thoregon', 'readwrite')
                                    .objectStore('thoregon')
                                    .delete(key);
            request.onerror   = reject;
            request.onsuccess = resolve;
        });
    }

}

if (!window.baseDB) {
    window.baseDB = new BaseDB();
    window.baseDB._init();
}
export default window.baseDB;
