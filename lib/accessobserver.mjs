/**
 *
 *
 * @author: Bernhard Lukassen
 */

/*
 * virtual properties
 */

import { doAsync }                from "./thoregonhelper.mjs";
import { isFunction }             from "./loader/bootutils.mjs";
import { isNil, isString, isRef } from "/evolux.util/lib/objutils.mjs";

import { asyncWithPath, propWithPath, probe, elems } from "/evolux.util/lib/pathutils.mjs";

let EXCLUDEDPROPS = ['constructor', 'target', 'parent', '_mths', '_eventListeners'];

let baseobserverproerties = [], baseobservermethods = [];

const isPrivateProperty = (property) => !isString(property) ? true :  property.startsWith('_') || property.startsWith('$') || property.endsWith('_') || property.endsWith('$');

export function getAllMethodNames(cls) {
    // let cls   = this.constructor.prototype;
    let props = [];

    // exclude the mthods from this class, they should not be accessible from outside
    while (cls && cls !== BaseObserver.prototype) {
        props = [...Object.getOwnPropertyNames(cls), ...props].unique();
        cls   = Object.getPrototypeOf(cls);
    };

    return props.filter(name => !EXCLUDEDPROPS.includes(name) && !name.endsWith('$$'));
}

/*
 * Observer
 */

class BaseObserver {

    constructor(target, parent) {
        this.target          = target;
        this.parent          = parent /*&& parent.$access ? parent.$access.target : parent*/;
        this._mths           = {};
        this._eventListeners = {};
    }

    static skipMethodDecoration(cls) {
        return cls === BaseObserver
    }

    // obsever(target, parent)
    static observe(...args) {
        let target = args[0];
        // can observe only Objects with a Proxy
        if (!target) return;
        if (typeof target !== 'object') return target;
        if (this.isObserved(target)) return target;

        const handler = new this(...args);
        const proxy = new Proxy(target, handler);
        handler.proxy$ = proxy;
        handler.__adjustTarget__(proxy);
        handler.__init__();
        return proxy;
    }

/* don't uncomment! otherwise those methods will be added to EXCUDEDPROPS
    __adjustTarget__() {}

    __init__() {}
*/

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
        // override by subclasses when needed
        return false;
    }

    isDecoratedMethod(name) {
        // override by subclasses when needed
        return false;
        // return baseobservermethods.includes(name);
    }

    static isObserved(target) {
        return !!(target?.__isObserved__);
    }

    isObserved(target) {
        return this.constructor.isObserved(target);
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

    __keys__() {
        return this.ownKeys(this.target);
    }

    //
    // retreive
    //

    get(target, prop, receiver) {
        if (prop === '__isObserved__'){
            return true;
        } else if (prop === 'is_empty') {
            return this.is_empty;
        } else if (prop === '$access') {
            return this;
        } else if (prop === 'constructor') {
            return this.target.constructor;
        } else {
            if (this.isDecoratedProperty(prop)) return this[prop];
            if (this._mths[prop]) return this._mths[prop];
            if (this.isDecoratedMethod(prop)) {
                let val = this[prop];
                if (isFunction(val)) {
                    val              = val.bind(this);
                    this._mths[prop] = val;
                }
                return val;
            }

            // todo: wrap fn's with AccessObserver
            this.beforeGet(target, prop, receiver);
            let value = this.doGet(target, prop, receiver) ?? target.metaClass?.getDefaultValue(prop); // todo [REFACTOR]: quickfix to get the default value
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
        if (value && !isPrivateProperty(prop) && !this.constructor.isObserved(value) && isRef(value)) {
            value = this.decorate(value, this.proxy$);
        }
        // this is not OK. each 'set' should also perform a set operation, which can be a function! The 'get' may also cause a stack overflow in this case
        // let oldValue = this.doGet(target, prop, receiver);
        // if (oldValue === value) return true; // do nothing
        let oldValue = Reflect.get(target, prop, receiver);
        value = this.beforeSet(target, prop, value, receiver) || value;
        this.doSet(target, prop, value, receiver);
        this.afterSet(target, prop, value, receiver);

        if (!isPrivateProperty(prop) && !this.dontEmit(prop)) this.emit('change', { obj: receiver, property: prop, newValue: value, oldValue });

        target.metaClass?.emitEntityEvents(receiver);

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
            let oldValue = Reflect.get(target, prop, receiver);
            // todo [OPEN]: introduce 'beforeChange' event handler to be able to prevent delete
            this.beforeDelete(target, prop, oldValue, receiver);
            this.doDelete(target, prop, receiver);
            this.afterDelete(target, prop, receiver);
            if (!isPrivateProperty(prop) && !this.dontEmit(prop)) this.emit('change', { obj: this.proxy$, property: prop, oldValue, newValue: undefined });
            target.metaClass?.emitEntityEvents(receiver);
        }
        return true;
    }

    beforeDelete(target, prop, oldvalue, receiver) {}

    doDelete(target, prop, receiver) {
        Reflect.deleteProperty(target, prop);
    }

    afterDelete(target, prop, receiver) {}

}

let accessobserverprops = [], accessobservermethods = [];

/**
 *
 *
 */
export default class AccessObserver extends BaseObserver {

    constructor(...args) {
        super(...args);
        this._deepListeners     = {};
        this._forwardDeepEvents = [];
        this._deferred          = {};
    }


    __adjustTarget__() {}

    __init__() {}

    isDecoratedProperty(name) {
        // override by subclasses when needed
        return accessobserverprops.includes(name) || super.isDecoratedProperty(name);
    }

    isDecoratedMethod(name) {
        // override by subclasses when needed
        return accessobservermethods.includes(name) || super.isDecoratedProperty(name);
    }

    async val() {
        return this.target;
    }

    //
    // deferred properties
    //

    whenExists(path, fn) {
        if (!this.__checkExists__(path, fn)) {
            const deeplistener = ((path, fn) => { return () => this.whenExists(path, fn) })(path, fn);
            let cbs            = this._deferred[path];
            if (!cbs) cbs = this._deferred[path] = [];
            cbs.push(fn);
            this.addDeepListener('change', deeplistener);
        }
    }

    __checkExists__(path, fn) {
        const value = this.proxy$.prop(path);
        if (value == undefined) return false;

        let cbs = this._deferred[path];
        if (!cbs) cbs = [fn];
        delete this._deferred[path];
        // todo: remove deep listener
        cbs.forEach((cb) => { try { cb() } catch (e) { console.log(e) } });

        return true;
    }

    //
    // Events & Listeners
    //

    addEventListener(eventname, listener, options) {
        // if (this.target.addEventListener) {
        //     return this.target.addEventListener(eventname, listener, options);
        // }
        listener._opt = options;
        let listeners = this._eventListeners[eventname];
        if (!listeners) this._eventListeners[eventname] = listeners = [];
        if (listeners.indexOf(listener) === -1) listeners.push(listener);
    }

    // enable check of existing listeners
    hasEventListener(eventname, listener) {
        let listeners = this._eventListeners[eventname];
        let existing = listeners?.find((l) => l === listener);
        return existing != undefined;
    }

    removeEventListener(eventname, listener) {
        // if (this.target.removeEventListener) {
        //     return this.target.removeEventListener(eventname, listener, options);
        // }
        let listeners = this._eventListeners[eventname];
        if (listeners) {
            let i = listeners.indexOf(listener);
            if (i > -1) listeners.splice(i, 1);
        }
    }

    removeAllListeners(eventname) {
        delete this._eventListeners[eventname];
    }

    dontEmit(prop) {
        return (this.target?.privateProperties$ ?? []).includes(prop);
    }

    emit(eventname, details, opt = {}) {
        let listeners = this._eventListeners[eventname];
        // if (!listeners || listeners.length === 0) return;
        if (opt?.once && listeners) delete this._eventListeners[eventname];
        (async (listeners, eventname, details, opt) => {
            doAsync();
            const remove = [];
            listeners?.forEach(listener => {
                try {
                    if (listener._opt?.once) remove.push(listener);
                    listener(Object.assign({}, details));
                } catch (e) {
                    universe.logger.warn('Mutation Listener cased an error', e);
                }
            })
            remove.forEach((listener) => this.removeEventListener(eventname, listener));
            this.__emitDeep__(eventname, details, opt);
        })(listeners, eventname, details, opt);
    }

    //
    // Deep Events & Listeners: propagate events from sub objects
    //

    hasDeepListeners() {
        const found = Object.values(this._deepListeners ?? {}).find((listeners) => !listeners.is_empty);
        return !!found;
    }

    /**
     * invoked when a property is changed
     * if it is an object and this has deep listeners, add forward event
     * @param prop
     * @private
     */
    __checkDeepListeners__(parent, prop) {
        const found = this._forwardDeepEvents.find((listener) => listener.parent === parent);
        if (!found) this._forwardDeepEvents.push({ parent, prop });
        this.__addDeepListenersOnProperties__()
    }

    beforeSet(target, prop, value, receiver) {
        super.beforeSet(target, prop, value, receiver);
        if (this.hasDeepListeners()) value?.__checkDeepListeners__?.(this.proxy$, prop);
    }

    beforeDelete(target, prop, oldvalue, receiver) {
        super.beforeDelete(target, prop, oldvalue, receiver);
        // oldvalue?.removeAllDeepListeners();
    }

    addDeepListener(eventname, listener, options) {
        listener._opt = options;
        let listeners = this._deepListeners[eventname];
        if (!listeners) this._deepListeners[eventname] = listeners = [];
        if (listeners.indexOf(listener) === -1) listeners.push(listener);
        this.__addDeepListenersOnProperties__();
    }

    __addDeepListenersOnProperties__() {
        const properties = Object.keys(this.target).filter((prop) => !isPrivateProperty(prop)); // all existing properties w/o private
        const receiver   = this.proxy$;
        properties.forEach((prop) => {
            const value = receiver[prop];
            value?.__checkDeepListeners__?.(receiver, prop);
        });
    }

    __emitDeep__(eventname, details, opt = {}) {
        if (!this._forwardDeepEvents?.is_empty) {
            this._forwardDeepEvents.forEach(({ parent, prop }) => {
                details.property = details.property ? `${prop}.${details.property}` : prop ;
                parent.__emitDeep__(eventname, details, opt);
            })
        } else {
            this.emitFromDeep(eventname, details, opt);
        }
    }

    emitFromDeep(eventname, details, opt = {}) {
        let listeners = this._deepListeners[eventname];
        // if (!listeners || listeners.length === 0) return;
        if (opt?.once && listeners) delete this._deepListeners[eventname];
        (async (listeners, eventname, details, opt) => {
            doAsync();
            const remove = [];
            listeners?.forEach(listener => {
                try {
                    if (listener._opt?.once) remove.push(listener);
                    listener(Object.assign({}, details));
                } catch (e) {
                    universe.logger.warn('Mutation Listener cased an error', e);
                }
            })
            // todo: remove deep listeners for 'once' events (remove.forEach((listener) => this.removeDeepListener(eventname, listener));)
        })(listeners, eventname, details, opt);
    }

/*    removeDeepListener(eventname, listener) {
        let listeners = this._deepListeners[eventname];
        if (listeners) {
            let i = listeners.indexOf(listener);
            if (i > -1) listeners.splice(i, 1);
        }
        this.__removeDeepListenerOnProperties__(eventname, listener);
    }

    removeAllDeepListeners(eventname) {
        if (eventname) {
            delete this._deepListeners[eventname];
        } else {
            this._deepListeners = {};
        }
        this.__removeAllDeepListenersOnProperties__(eventname);
    }

    __removeDeepListenerOnProperties__(eventname, listener) {

    }

    __removeAllDeepListenersOnProperties__(eventname) {

    }*/

    //
    // convenience methods
    //

    prop(path, value) {
        if (!path) return this.proxy$;
        if (value != undefined) {
            const parts   = elems(path);
            const setprop = parts.pop();
            const obj     = propWithPath(this.proxy$, parts.join('.'));
            if (!obj) return;
            obj[setprop] = value;
            return obj[setprop];
        } else {
            return propWithPath(this.proxy$, path);
        }
    }

    async asyncprop(path, value) {
        if (!path) return this.proxy$;
        if (value != undefined) {
            const parts = elems(path);
            const setprop = parts.pop();
            const obj = await asyncWithPath(this.proxy$, parts.join('.'));
            if (!obj) return;
            obj[setprop] = value;
            return await obj[setprop];
        } else {
            return await asyncWithPath(this.proxy$, path);
        }
    }

    async probe() {
        return await probe(this.proxy$);
    }

    get soul() {
        return this.target?.['#'];
    }
/*
    !! don't redefine
    get length() {
        return this.target?.length ?? Object.keys(this.target ?? {}).length ?? 0;
    }
*/

    get is_empty() {
        return this.length === 0;
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

    accessobservermethods = getAllMethodNames(AccessObserver.prototype);
})();
