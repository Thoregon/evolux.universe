import {forEach, isFunction} from "/evolux.util";

/**
 *
 * ToDo:
 *  - add available property list
 *  - maybe move to pub/sub with a central registry
 *
 * @author: Bernhard Lukassen
 */

export const hasDeferredProperty    = (obj) => obj.deferredProperty && isFunction(obj.deferredProperty);
export const notifyDeferredProperty = (notifier, name, value) => notifier._notifyProperty(name, value);

export const DeferredProperties = base => class extends base {

    /**
     * introduce a
     */
    constructor() {
        super(...arguments);
        this._propertyListeners =  {};
    }

    deferredProperty(name) {
        if (this[name]) return this[name];
        return Promise(resolve => {
            this._onProperty(name, resolve);
        })
    }

    _onProperty(name, fn) {
        let listeners = this._propertyListeners[name];
        if (!listeners) {
            listeners = [];
            this._propertyListeners[name] = listeners;
        }
        listeners.push(fn);
    }

    async _notifyProperty(name, object) {
        try {
            const listeners = this._propertyListeners[name];
            if (!listeners) return;
            await forEach(listeners, async (listener) => await listener(object));
        } catch (e) {
            this.logger.error(`universe: error notify deferred property ${name}`, e, name, object);
        }
    }

};
