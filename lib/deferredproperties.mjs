
import { isFunction } from "/evolux.util/lib/objutils.mjs";

/**
 *
 * ToDo:
 *  - add available property list
 *  - maybe move to pub/sub with a central registry
 *
 * @author: Bernhard Lukassen
 */

export const hasDeferredProperty    = (obj) => obj.deferredProperty && isFunction(obj.deferredProperty);
export const notifyDeferredProperty = (notifier, name, value) => notifier.notifyProperty(name, value);

export const DeferredProperties = (base) => class extends base {

    /**
     * introduce a
     */
    constructor() {
        super(...arguments);
        this.propertyListeners =  {};
    }

    deferredProperty(name) {
        if (this[name]) return this[name];
        return new Promise((resolve) => {
            this.onProperty(name, resolve);
        })
    }

    onProperty(name, fn) {
        let listeners = this.propertyListeners[name];
        if (!listeners) {
            listeners = [];
            this.propertyListeners[name] = listeners;
        }
        listeners.push(fn);
    }

    async notifyProperty(name, object) {
        try {
            const listeners = this.propertyListeners[name];
            if (!listeners) return;
            for await (const listener of listeners) await listener(object);
        } catch (e) {
            this.logger.error(`universe: error notify deferred property ${name}`, e, name, object);
        }
    }

};
