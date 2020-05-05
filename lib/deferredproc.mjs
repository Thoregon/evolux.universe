import {forEach, isFunction} from "/evolux.util";

/**
 *
 * ToDo:
 *  - add available property list
 *  - maybe move to pub/sub with a central registry
 *
 * @author: Bernhard Lukassen
 */

export const DeferredProc = (base) => class extends base {

    /**
     * introduce a
     */
    constructor() {
        super();
        this._deferredproc =  {};
    }

    enqueue(queuename, selectfn, dofn) {
        let queue = this._deferredproc[queuename];
        if (!queue) {
            queue = [];
            this._deferredproc[queuename] = queue;
        }
        queue.push({ selectfn, dofn });
    }






    async deferredProperty(name) {
        if (this[name]) return this[name];
        return await new Promise(resolve => {
            this._onProperty(name, resolve);
        })
    }

    _onProperty(name, fn) {
        let listeners = this._onDeferredProperty[name];
        if (!listeners) {
            listeners = [];
            this._onDeferredProperty[name] = listeners;
        }
        listeners.publish(fn);
    }

    async _notifyProperty(name, object) {
        try {
            const listeners = this._onDeferredProperty[name];
            if (!listeners) return;
            await forEach(listener => listener(object));
        } catch (e) {
            this.logger.error(`universe: error notify deferred proerty ${name}`, e, name, object);
        }
    }

};
