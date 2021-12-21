/**
 *
 *
 * @author: Bernhard Lukassen
 */

/*
 * virtual properties
 */

import { doAsync }    from "./thoregonhelper.mjs";
import { isFunction } from "./loader/bootutils.mjs";

let EXCLUDEDPROPS = ['is_empty', 'constructor', 'target', 'parent', '_props', '_mths', '_eventListeners'];

/*
 * Observer
 */

class BaseObserver {

    constructor(target, parent) {
        this.target          = target;
        this.parent          = parent /*&& parent.$access ? parent.$access.target : parent*/;
        this._props          = this.getAllPropertyNames();
        this._mths           = this.getAllMethodNames()
        this._eventListeners = {};
    }

    // obsever(target, parent)
    static observe(...args) {
        let target = args[0];
        // can observe only Objects with a Proxy
        if (!target) return;
        if (this.isObserved(target)) return target;
        if (typeof target !== 'object') return target;

        const handler = new this(...args);
        const proxy = new Proxy(target, handler);
        handler.proxy$ = proxy;

        return proxy;
    }

    /**
     * collect the properties of the decorator/observer itself
     * exclude all properties listed in EXCLUDEDPROPS
     *
     * @return {Array}
     */
    getAllPropertyNames() {
        return Reflect.ownKeys(this).filter(name => !EXCLUDEDPROPS.includes(name) && !name.endsWith('$') &&  !name.endsWith('__'));
    }

    /**
     * collect all method names of the subclass(es)
     * just don't expose the methods of this class to the outside
     *
     * @return {Array}
     */
    getAllMethodNames() {
        let cls   = this.constructor.prototype;
        let props = [];

        // exclude the mthods from this class, they should not be accessible from outside
        while (cls && cls !== BaseObserver.prototype) {
            props = [...Object.getOwnPropertyNames(cls), ...props].unique();
            cls   = Object.getPrototypeOf(cls);
        };

        return props.filter(name => !EXCLUDEDPROPS.includes(name) && !name.endsWith('$$'));
    }

    isDecoratedProperty(name) {
        return this._props.includes(name);
    }

    isDecoratedMethod(name) {
        return this._mths.includes(name);
    }

    static isObserved(target) {
        return !!target.__isObserved__;
    }

    /**
     * observe the 'sub' object which is set to a property
     *
     * @param target
     * @param parent
     * @return {any}
     */
    decorate(target, parent) {
        return this.constructor.observe(target, parent);
    }

    /*
     * Proxy handler implementation
     */

    has(target, key) {
        return Reflect.has(target, key); // key in target;
    }

    ownKeys(target) {
        let props = Reflect.ownKeys(target);
        props = props.filter(key => !key.startsWith('_') && !key.startsWith('$')); // filter private properties
        return props;
    }

    //
    // retreive
    //

    get(target, prop, receiver) {
        if (prop === '__isObserved__'){
            return true;
        } else if (prop === '$access') {
            return this;
        } else {
            if (this.isDecoratedProperty(prop)) return this[prop];
            if (this.isDecoratedMethod(prop)) {
                const val = this[prop];
                return isFunction(val) ? val.bind(this) : val;
            }

            // todo: wrap fn's with AccessObserver
            this.beforeGet(target, prop, receiver);
            let value = this.doGet(target, prop, receiver);
            value     = this.afterGet(target, prop, value, receiver);
            return value;
        }
    }

    doGet(target, prop, receiver) {
        return Reflect.get(target, prop, receiver);
    }

    beforeGet(target, prop, receiver) {}

    afterGet(target, prop, value, receiver) {
        return value;
    }

    //
    // manipluation
    //

    set(target, prop, value, receiver) {
        if (this.isDecoratedProperty(prop) || this.isDecoratedMethod(prop)) {
            // this[prop] = prop;   // don't allow modifications of decorator properties from outside
            return false;
        }
        if (value && !this.constructor.isObserved(value)) {
            value = this.decorate(value, this);
        }
        let oldValue = this.doGet(target, prop, receiver);
        if (oldValue === value) return true; // do nothing

        value = this.beforeSet(target, prop, value, receiver) || value;
        this.doSet(target, prop, value, receiver);
        this.afterSet(target, prop, value, receiver);

        this.emit('change', { prop, oldValue, newValue: value});
        return true;
    }

    beforeSet(target, prop, value, receiver) {}

    doSet(target, prop, value, receiver) {
        Reflect.set(target, prop, value, receiver);
        // console.log("**> set property", '['+prop+']', value);
    }

    afterSet(target, prop, value, receiver) {}

    //
    //
    //

    deleteProperty(target, prop, receiver) {
        if (this.isDecoratedProperty(prop) || this.isDecoratedMethod(prop)) {
            // delete this[prop]    // don't allow delete of properties from the decorator
            return false;
        }
        if (prop in target) {
            let oldValue = target[prop];
            // todo [OPEN]: introduce 'beforeChange' event handler to be able to prevent delete
            this.beforeDelete(target, prop, oldValue, receiver);
            Reflect.deleteProperty(target, prop);
            this.afterDelete(target, prop, receiver);
            this.emit('change', { prop, oldValue, newValue: undefined });
        }
        return true;
    }

    beforeDelete(target, prop, oldvalue, receiver) {}

    doDelete(target, prop) {
        Reflect.deleteProperty(target, prop);
    }

    afterDelete(target, prop, receiver) {}

    //
    // events
    //
/*

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
*/


    /* no need so far to implement to implement the remaining hook methods

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

/**
 *
 */
export default class AccessObserver extends BaseObserver {

    async val() {
        return this.target;
    }

    addEventListener(eventname, listener) {
        let listeners = this._eventListeners[eventname];
        if (!listeners) {
            listeners = [];
            this._eventListeners[eventname] = listeners;
        }
        if (listeners.indexOf(listener) === -1) listeners.push(listener);
    }

    removeEventListener(eventname, listener) {
        let listeners = this._eventListeners[eventname];
        if (listeners) {
            let i = listeners.indexOf(listener);
            if (i > -1) listeners.splice(i, 1);
        }
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

}

// init the excluded methods
// this methods should not be accessible from outside
(() => {
    let cls   = BaseObserver.prototype;

    // exclude the mthods from this class, they should not be accessible from outside
    while (cls) {
        EXCLUDEDPROPS = [...Object.getOwnPropertyNames(cls), ...EXCLUDEDPROPS].unique();
        cls   = Object.getPrototypeOf(cls);
    };
})();
