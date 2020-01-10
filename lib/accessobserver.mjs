/**
 *
 *
 * @author: Bernhard Lukassen
 */

export default class AccessObserver {

    constructor(parent) {
        this.parent = parent;
    }

    static observe(target, parent) {
        // can observe only Objects with a Proxy
        return target.$access
            ? target
            : (typeof target === 'object')
            ? new Proxy(target, new this(parent))
            : target;
    }

    /*
     * Proxy handler implementation
     */

    has(target, key) {
        return key in target;
    }

    get(target, prop, receiver) {
        if (prop === '$access') {
            return this;
        } else {
            // todo: wrap fn's with AccessObserver
            const value = Reflect.get(target, prop, receiver); // target[prop];
            return value;
        }
    }

    set(target, prop, value, receiver) {
        if (!value.$access) {
            value = AccessObserver.observe(value, this);
        }
        // target[prop] = value;
        return Reflect.set(target, prop, value, receiver); // true;
    }

    deleteProperty(target, prop) {
        if (prop in target) {
            delete target[prop];
        }
    }

    construct(target, args) {
        return new target(...args);
    }

    apply(target, thisArg, argumentsList) {
        return Reflect.apply(target, thisArg, argumentsList);
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
