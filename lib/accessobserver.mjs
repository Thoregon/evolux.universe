/**
 *
 *
 * @author: Bernhard Lukassen
 */

/*
 * virtual properties
 */

import { doAsync }      from "./thoregonhelper.mjs";

const decorator = {
    ownKeys(obj, receiver, observer, prop) {
        return new Promise((resolve, reject) => {
            try {
                let props = Reflect.ownKeys(obj);
                props = props.filter(key => !key.startsWith('_') && !key.startsWith('$'));
                resolve(props);
            } catch (e) {
                reject(e);
            }
        });
    },

    val(target, receiver, observer, prop) {
        return target;
    },

    addEventListener(target, receiver, observer, prop) {
        return (eventname, listener) => {
            let listeners = observer._eventListeners[eventname];
            if (!listeners) {
                listeners = [];
                observer._eventListeners[eventname] = listeners;
            }
            if (listeners.indexOf(listener) === -1) listeners.push(listener);
        }
    },

    removeEventListener(target, receiver, observer, prop) {
        return (eventname, listener) => {
            let listeners = observer._eventListeners[eventname];
            if (listeners) {
                let i = listeners.indexOf(listener);
                if (i > -1) listeners.splice(i, 1);
            }
        }
    }
};

/*
 * Observer
 */

export default class AccessObserver {

    constructor(target, parent) {
        this.target          = target;
        this.parent          = parent && parent.$access ? parent.$access.target : parent;
        this.decorator       = this.initialDecorator();
        this._eventListeners = {};
    }

    // obsever(target, parent)
    static observe(...args) {
        let target = args[0];
        // can observe only Objects with a Proxy
        return !target
            ? undefined
            : target.$access
                ? target
                : (typeof target === 'object')
                    ? new Proxy(target, new this(...args))
                    : target;
    }

    initialDecorator() {
        return decorator;
    }

    isDecorated(prop) {
        return this.decorator.hasOwnProperty(prop);
    }

    /*
     * Proxy handler implementation
     */

    has(target, key) {
        return Reflect.has(target, key); // key in target;
    }

    ownKeys(target) {
        return Reflect.ownKeys(target)
    }

    //
    // retreive
    //

    get(target, prop, receiver) {
        if (prop === '$access') {
            return this;
        } else {
            if (this.isDecorated(prop)) return this.decorator[prop](target, receiver, this, prop);

            // todo: wrap fn's with AccessObserver
            let value = this.beforeGet(target, prop, Reflect.get(target, prop, receiver), receiver);
            value     = this.afterGet(target, prop, value, receiver);
            return value;
        }
    }

    beforeGet(target, prop, value, receiver) {
        return value;
    }

    afterGet(target, prop, value, receiver) {
        return value;
    }

    //
    // manipluation
    //

    set(target, prop, value, receiver) {
        if (value && !value.$access) {
            value = AccessObserver.observe(value, this);
        }
        // target[prop] = value;
        let oldValue = target[prop];
        // todo [OPEN]: introduce 'beforeChange' event handler to be able modify value
        value = this.beforeSet(target, prop, value, receiver) || value;
        Reflect.set(target, prop, value, receiver);
        this.afterSet(target, prop, value, receiver);
        this.emit('change', { prop, oldValue, newValue: value});
        return true;
    }

    beforeSet(target, prop, value, receiver) {}

    afterSet(target, prop, value, receiver) {}

    //
    //
    //

    deleteProperty(target, property, receiver) {
        if (property in target) {
            let oldValue = target[property];
            // todo [OPEN]: introduce 'beforeChange' event handler to be able to prevent delete
            this.beforeDelete(target, property, oldValue, receiver);
            Reflect.deleteProperty(target, property);
            this.afterDelete(target, property, receiver);
            this.emit('change', {  property, oldValue, newValue: undefined });
        }
        return true;
    }

    beforeDelete(target, prop, value, receiver) {}

    afterDelete(target, prop, receiver) {}

    //
    // events
    //

    emit(eventname, details) {
        let listeners = this._eventListeners[eventname];
        if (!listeners || listeners.length === 0) return;
        (async (listeners) => {
            doAsync();
            listeners.forEach(listener => {
                try {
                    listener(Object.assign({}, details));
                } catch (e) {
                    universe.logger.warn('Mutation Listener cased an error', e);
                }
            })
        })(listeners);
    }


    /*

    construct(target, args) {
        return Reflect.construct(target, args); // new target(...args);
    }

    apply(target, thisArg, args) {
        return Reflect.apply(target, thisArg, args);
    }

        defineProperty(target, key, descriptor) {
            target[key] = undefined;
            return true;
        }

        getOwnPropertyDescriptor(target, prop) {
            return { configurable: true, enumerable: true, writable: true, value: target[prop] };
        }

        getPrototypeOf(target) {
            return Object.getPrototypeOf(target);
        }

        isExtensible(target) {
            return Reflect.isExtensible(target);
        }

        preventExtensions(target) {
            target.canEvolve = false;
            return Reflect.preventExtensions(target);
        }

        setPrototypeOf(tagrget, targetProto) {
            return false;
        }
    */

}
