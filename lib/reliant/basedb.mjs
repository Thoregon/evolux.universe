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

export class BaseDB {

    constructor(dbname, storename) {
        this.DBNAME    = dbname ?? 'thoregon';
        this.STORENAME = storename ?? 'thoregon';
    }

    async _init() {
        const base = this;
        return new Promise((resolve, reject) => {
            const openDB = indexedDB.open(this.DBNAME, 1);
            openDB.onupgradeneeded = (ev) => {
                const db = ev.target.result;
                const store = db.createObjectStore(this.STORENAME, { keyPath: 'id' });
            };
            openDB.onblocked = (ev) => {
                if (base.db) {
                    base.db.close();
                    delete base.db;
                }
                setTimeout(() => this._init(), 350);
            };
            openDB.onsuccess = (ev) => {
                const db = base.db = ev.target.result;
                // add a handler for version change from another tab
                db.onversionchange = () => {
                    base.db = undefined;
                    db.close();
                    setTimeout(() => this._init(), 350);
                };
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
                                    .transaction(this.STORENAME, 'readonly')
                                    .objectStore(this.STORENAME)
                                    .get(key);
            request.onabort   = reject;
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
            const exists = await this.get(key) != undefined;
            const transaction = this.db.transaction(this.STORENAME, 'readwrite');
            const store       = transaction.objectStore(this.STORENAME);
            if (exists) {
                store.put({ id: key, payload: value });
            } else {
                store.add({ id: key, payload: value });
            }
            transaction.onabort    = reject;
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
                                    .transaction(this.STORENAME, 'readwrite')
                                    .objectStore(this.STORENAME)
                                    .delete(key);
            request.onabort   = (...args) => {
                reject(...args);
            }
            request.onerror   = (...args) => {
                reject(...args);
            }
            request.onsuccess = (...args) => {
                resolve(...args);
            }
        });
    }

}

if (!globalThis.baseDB) {
    globalThis.baseDB = new BaseDB();
    globalThis.baseDB._init();
}

export default globalThis.baseDB;
