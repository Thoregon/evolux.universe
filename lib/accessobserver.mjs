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

const isDecorated = (prop) => {
    return decorator.hasOwnProperty(prop);
}

/*
 * Observer
 */

export default class AccessObserver {

    constructor(target, parent) {
        this.target = target;
        this.parent = parent && parent.$access ? parent.$access.target : parent ;
        this._eventListeners = {};
    }

    static observe(target, parent) {
        // can observe only Objects with a Proxy
        return !target
            ? undefined
            : target.$access
                ? target
                : (typeof target === 'object')
                    ? new Proxy(target, new this(target, parent))
                    : target;
    }

    /*
     * Proxy handler implementation
     */

    has(target, key) {
        return Reflect.has(target, key); // key in target;
    }

    get(target, prop, receiver) {
        if (prop === '$access') {
            return this;
        } else {
            if (isDecorated(prop)) return decorator[prop](target, receiver, this, prop);

            // todo: wrap fn's with AccessObserver
            const value = Reflect.get(target, prop, receiver); // target[prop];
            return value;
        }
    }

    set(target, property, value, receiver) {
        if (value && !value.$access) {
            value = AccessObserver.observe(value, this);
        }
        // target[prop] = value;
        let oldValue = target[property];
        Reflect.set(target, property, value, receiver);
        this.emit('change', { property, oldValue, newValue: value});
        return true;
    }

    deleteProperty(target, property, receiver) {
        if (property in target) {
            let oldValue = target[property];
            Reflect.deleteProperty(target, property);
            this.emit('change', {  property, oldValue, newValue: undefined });
        }
        return true;
    }

    construct(target, args) {
        return Reflect.construct(target, args); // new target(...args);
    }

    apply(target, thisArg, args) {
        return Reflect.apply(target, thisArg, args);
    }

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

        ownKeys (target) {
            return Reflect.ownKeys(target)
        }
    */

}
