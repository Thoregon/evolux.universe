/**
 *
 *
 * @author: Bernhard Lukassen
 */

/*
 * virtual properties
 */

import { doAsync }                          from "./thoregonhelper.mjs";
import { isFunction }                       from "./loader/bootutils.mjs";
import { isNil, isString, isSymbol, isRef } from "/evolux.util/lib/objutils.mjs";

import { asyncWithPath, propWithPath, probe, elems } from "/evolux.util/lib/pathutils.mjs";

let EXCLUDEDPROPS = ['constructor', 'target', 'parent', '_mths', '_eventListeners', '_deepListeners', '_forwardDeepEvents'];

let baseobserverproerties = [], baseobservermethods = [];

export const isPrivateProperty = (property) => isSymbol(property) ? true : !isString(property) ? false :  property.startsWith('_') || property.startsWith('$') || property.endsWith('_') || property.endsWith('$');

const rnd = (l) => {
    return btoa( String.fromCharCode( ...crypto.getRandomValues(new Uint8Array(l ?? 32)) ) ).replaceAll(/[\/|+|=]/g,'').substring(0, l ?? 32);
}

const DBGID = '== AccessObserver';

const UNIVERSE = () => globalThis.universe ? universe : { debuglog: () => {}, logger: { warn: (...args) => console.log(DBGID, ...args) } };

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

export function getAllMethodNamesCategorized(cls) {
    // let cls   = this.constructor.prototype;
    let props = {};

    // exclude the mthods from this class, they should not be accessible from outside
    while (cls && cls !== BaseObserver.prototype) {
        const mthNames = Object.getOwnPropertyNames(cls);
        mthNames.forEach((mthname) => {
            if (isPrivateProperty(mthname) || EXCLUDEDPROPS.includes(mthname) || mthname.endsWith('$$')) return;
            const descriptor = Object.getOwnPropertyDescriptor(cls, mthname)
            if (!descriptor) return;
            // todo [REFACTOR]: check also which accessors (get/set) are avaliable
            props[mthname] = (typeof descriptor.value === 'function') ? 'method' : 'accessor';
        })
        cls   = Object.getPrototypeOf(cls);
    };

    return props;
}

/**
 * Observer
 */

class BaseObserver {

    constructor(target, parent) {
        this.target          = target;
        this.parent          = parent /*&& parent.$access ? parent.$access.target : parent*/;
        this._mths           = {};
        this._eventListeners = {};
        this._x              = rnd(8);
        this._propertyDescriptors = {};
    }

    static skipMethodDecoration(cls) {
        return cls === BaseObserver
    }

    // obsever(target, parent)
    static observe(...args) {
        let target = args[0];
        let opt    = args[1] ?? { create: false, load: false};
        let props  = opt.props ?? {};
        // can observe only Objects with a Proxy
        if (!target) return;
        if (typeof target !== 'object') return target;
        if (target instanceof Date) return target;
        if (this.isObserved(target)) return target;

        const handler = new this(...args);
        const proxy = new Proxy(target, handler);
        handler.proxy$ = proxy;
        handler.__adjustTarget__({ ...target, ...props });
        handler.__init__(opt);
        return proxy;
    }

/* don't uncomment! otherwise those methods will be added to EXCUDEDPROPS
    __adjustTarget__() {}

    __init__(opt) {}
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
        return getAllMethodNames(cls);
/*
        let props = [];

        // exclude the mthods from this class, they should not be accessible from outside
        while (cls && cls !== BaseObserver.prototype) {
            props = [...Object.getOwnPropertyNames(cls), ...props].unique();
            cls   = Object.getPrototypeOf(cls);
        };

        return props.filter(name => !EXCLUDEDPROPS.includes(name) && !name.endsWith('$$'));
*/
    }

    getAllMethodNamesCategorized() {
        let cls   = this.constructor.prototype;
        return getAllMethodNamesCategorized(cls);
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
        return this.constructor.isObserved(target ?? this);
    }

    /**
     * observe the 'sub' object which is set to a property
     *
     * @param target
     * @param parent
     * @return {any}
     */
    decorate(target, parent, prop, opt = {}) {
        return this.constructor.observe(target, { parent, ...opt });
    }

    /*
     * Proxy handler implementation
     */

    has(target, key) {
        return Reflect.has(target, key); // key in target;
    }

    ownKeys(target) {
        let props = Reflect.ownKeys(target);
        props = props.filter(key => !isPrivateProperty(key)); // filter private properties  !key.startsWith('_') && !key.startsWith('$')
        return props;
    }

    defineProperty(target, prop, descriptor) {
        this._propertyDescriptors[prop] = descriptor;
        Object.defineProperty(target, prop, descriptor);
        return true;
    }

    getOwnPropertyDescriptor(target, prop) {
        let descriptor = this.__getOwnPropertyDescriptor__(target, prop);
        return descriptor;
    }

    __getOwnPropertyDescriptor__(target, prop) { // called for every property
        let descriptor = this._propertyDescriptors[prop];
        if (descriptor) return descriptor;
        descriptor = this._propertyDescriptors[prop] = Object.getOwnPropertyDescriptor(target, prop);
        if (descriptor) return descriptor;
        if (!this.has(target, prop)) return;
        descriptor = this.__buildPropertyDescriptor__(prop);
        return descriptor;
    }

    __buildPropertyDescriptor__(prop) {
        return undefined;
    }

    __getPropertyDescriptorValue__(target, prop) {
        return Reflect.get(target, prop);
    }

    __keys__() {
        return this.ownKeys(this.target);
    }

    //
    // retreive
    //

    get(target, prop, receiver, opt = {}) {
        // UNIVERSE().debuglog(DBGID, "GET", prop);
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
            this.beforeGet(target, prop, receiver, opt);
            let value = this.doGet(target, prop, receiver, opt) ?? this.getDefaultValue(target, prop, opt); // todo [REFACTOR]: quickfix to get the default value
            value     = this.afterGet(target, prop, value, receiver, opt);
            return value;
        }
    }

    getDefaultValue(target, prop, opt = {}) {
        UNIVERSE().debuglog(DBGID, "getDefaultValue", prop);
        return this.whichMetaclass(target)?.getDefaultValue(prop);
    }

    doGet(target, prop, receiver, opt = {}) {
        return Reflect.get(target, prop, receiver);
    }

    beforeGet(target, prop, receiver, opt = {}) {}

    afterGet(target, prop, value, receiver, opt = {}) {
        return value;
    }

    whichMetaclass(target) {
        return target?.metaClass ?? this.metaClass$;
    }

    //
    // manipluation
    //

    set(target, prop, value, receiver, opt = {}) {
        if (this.isDecoratedProperty(prop) || this.isDecoratedMethod(prop)) {
            // this[prop] = prop;   // don't allow modifications of decorator properties from outside
            return false;
        }
        // ** moved to method __wrap__()
        // if (value && !isPrivateProperty(prop) && !this.constructor.isObserved(value) && isRef(value)) {
        //     value = this.decorate(value, this.proxy$, prop);
        // }
        // UNIVERSE().debuglog(DBGID, "SET", prop);
        // this is not OK. each 'set' should also perform a set operation, which can be a function! The 'get' may also cause a stack overflow in this case
        // let oldValue = this.doGet(target, prop, receiver);
        // if (oldValue === value) return true; // do nothing
        UNIVERSE().debuglog(DBGID, ">> SET::get old value", prop);
        let oldValue = Reflect.get(target, prop, receiver);
        UNIVERSE().debuglog(DBGID, ">> SET::befor set", prop);
        value = this.beforeSet(target, prop, value, receiver, opt = {}) || value;
        UNIVERSE().debuglog(DBGID, ">> SET::do set", prop);
        let modified = this.doSet(target, prop, value, receiver, opt = {});
        if (modified && this._propertyDescriptors[prop]) this._propertyDescriptors[prop].value = value;
        UNIVERSE().debuglog(DBGID, ">> SET::after set", prop);
        this.afterSet(target, prop, value, receiver, opt = {});

        UNIVERSE().debuglog(DBGID, ">> SET::emit changes", prop);
        if (modified && !isPrivateProperty(prop) && !this.dontEmit(prop)) this.emit('change', { type: 'change', ...this.additionalEventParams(), obj: receiver, property: prop, newValue: value, oldValue });

        UNIVERSE().debuglog(DBGID, ">> SET::emit entity events", prop);
        target.metaClass?.emitEntityEvents(receiver);
        UNIVERSE().debuglog(DBGID, ">> SET::DONE", prop);

        return true;
    }

    additionalEventParams() {
        return {};
    }

    beforeSet(target, prop, value, receiver, opt = {}) {}

    doSet(target, prop, value, receiver, opt = {}) {
        Reflect.set(target, prop, value/*, receiver*/);
        return true;
        // console.log("**> set property", '['+prop+']', value);
    }

    afterSet(target, prop, value, receiver, opt = {}) {}

    //
    //
    //

    deleteProperty(target, prop, receiver, opt = {}) {
        if (this.isDecoratedProperty(prop) || this.isDecoratedMethod(prop)) {
            // delete this[prop]    // don't allow delete of properties from the decorator
            return false;
        }
        UNIVERSE().debuglog(DBGID, "DELETE");
        if (this.__canDelete__(target, prop)) {
            delete this._propertyDescriptors[prop];
            let oldValue = Reflect.get(target, prop, receiver);
            // todo [OPEN]: introduce 'beforeChange' event handler to be able to prevent delete
            this.beforeDelete(target, prop, oldValue, receiver, opt);
            let modified = this.doDelete(target, prop, receiver, opt);
            if (modified && this._propertyDescriptors[prop]) delete this._propertyDescriptors[prop].value;
            this.afterDelete(target, prop, receiver, opt);
            if (modified && !isPrivateProperty(prop) && !this.dontEmit(prop)) this.emit('change', { type: 'delete', ...this.additionalEventParams(), obj: this.proxy$, property: prop, oldValue, newValue: undefined });
            target.metaClass?.emitEntityEvents(receiver);
        }
        return true;
    }

    beforeDelete(target, prop, oldvalue, receiver, opt = {}) {}

    doDelete(target, prop, receiver, opt = {}) {
        Reflect.deleteProperty(target, prop);
        return true;
    }

    afterDelete(target, prop, receiver, opt = {}) {}

    wasDeleted(prop) {
        return false;
    }

    __canDelete__(target, prop) {
        return (prop in target);
    }

}

let accessobserverprops = [], accessobservermethods = [];

//
// globalized deep listeners
//


const DEEP_LISTENERS = {};

/**
 *
 *
 */
export default class AccessObserver extends BaseObserver {

    constructor(...args) {
        super(...args);
        // this._deepListeners     = {};
        // this._forwardDeepEvents = [];
        this._deferred          = {};
    }


    __adjustTarget__() {}

    __init__(opt) {}

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

    commit$() {
    }

    observerClass() {
        return AccessObserver;
    }


    materialize() {
        this.__materializeReferenced__();
    }

    __materializeReferenced__(visited = new Set()) {
        Object.entries(this.target).forEach(([prop, value]) => {
            if (visited.has(value)) return;
            if (value != undefined && isObject(value)) {
                visited.add(value);
                if (isPrivateProperty(prop)) return;
                if (value.$thoregon) {
                    value.materialize?.();
                } else {
                    value.__materializeReferenced__?.(visited);
                }
            }
        });
    }

    getAllMethodNames$() {
        const cls = this.target.constructor.prototype;
        return getAllMethodNames(cls);
    }

    getAllMethodNamesCategorized$() {
        const cls = this.target.constructor.prototype;
        return getAllMethodNamesCategorized(cls);
    }

    //
    // Primitive Reflection
    //

    static __primitive__(receiver) {
        if (!receiver.$access) return { /*decorator: receiver, target: receiver*/ }
        const decorator = receiver.$access;
        const target    = decorator.target;
        return { decorator, target }
    }

    static primitiveGet(receiver, prop) {
        const { decorator, target } = this.__primitive__(receiver);
        if (!target) return;
        return Reflect.get(target, prop);
    }

    static primitiveSet(receiver, prop, value) {
        const { decorator, target } = this.__primitive__(receiver);
        if (!target) return;
        if (Array.isArray(target) && prop === 'length') return;
        return Reflect.set(target, prop, value);
    }

    static primitiveDelete(receiver, prop) {
        const { decorator, target } = this.__primitive__(receiver);
        if (!target) return;
        return Reflect.deleteProperty(target, prop);
    }

    static primitiveHas(receiver, prop) {
        const { decorator, target } = this.__primitive__(receiver);
        if (!target) return;
        return Reflect.has(target, prop);
    }

    //
    // Events & Listeners
    //

    addEventListener(eventname, listener, options) {
        // if (this.target.addEventListener) {
        //     return this.target.addEventListener(eventname, listener, options);
        // }
        UNIVERSE().debuglog(DBGID, "addEventListener", eventname);
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
            UNIVERSE().debuglog(DBGID, "removeEventListener", eventname);
            let i = listeners.indexOf(listener);
            if (i > -1) listeners.splice(i, 1);
        }
    }

    removeAllListeners(eventname) {
        delete this._eventListeners[eventname];
    }

    /**
     * move listeners (also deep) to the other entity
     *
     * @param other
     */
    moveAllListeners(other) {

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
            if (listeners) UNIVERSE().debuglog(DBGID, "emit", this, eventname, details);
            const remove = [];
            // const target = this;
            listeners?.forEach(listener => {
                try {
                    if (listener._opt?.once) remove.push(listener);
                    // listener.bind(target);
                    listener(Object.assign({}, details));
                } catch (e) {
                    UNIVERSE().logger.warn('Mutation Listener cased an error', e);
                }
            })
            remove.forEach((listener) => this.removeEventListener(eventname, listener));
            this.__emitDeep__(eventname, details, opt);
        })(listeners, eventname, details, opt);
    }

    //
    // Deep Events & Listeners: propagate events from sub objects
    //

    __wrap__(prop, value) {
        if (value && !isPrivateProperty(prop) && !this.constructor.isObserved(value) && isRef(value)) return this.decorate(value, this.proxy$, prop);
        return value;
    }

    beforeSet(target, prop, value, receiver) {
        super.beforeSet(target, prop, value, receiver);
        value = this.__wrap__(prop, value);
        return value
    }

    beforeDelete(target, prop, oldvalue, receiver) {
        super.beforeDelete(target, prop, oldvalue, receiver);
    }

    static addDeepListener(eventname, listener, options) {
        if (this.noDeepListeners$?.()) return;
        listener._opt = options;
        let listeners = DEEP_LISTENERS[eventname];
        if (!listeners) DEEP_LISTENERS[eventname] = listeners = [];
        if (listeners.indexOf(listener) === -1) listeners.push(listener);
        UNIVERSE().debuglog(DBGID, "addDeepListener", eventname);
    }

    addDeepListener(eventname, listener, options) {
        return this.constructor.addDeepListener(eventname, listener, options);
    }

    __emitDeep__(eventname, details, options = {}) {
        let listeners = DEEP_LISTENERS[eventname];
        (async (listeners, eventname, details, opt) => {
            doAsync();
            if (listeners) UNIVERSE().debuglog("emitFromDeep", this, eventname, details);
            const remove = [];
            listeners?.forEach(listener => {
                try {
                    listener(Object.assign({}, details));
                } catch (e) {
                    UNIVERSE().logger.warn('Mutation Listener cased an error', e);
                }
            })
            // todo: remove deep listeners for 'once' events (remove.forEach((listener) => this.removeDeepListener(eventname, listener));)
        })(listeners, eventname, details, options);
    }

    removeDeepListener(eventname, listener, options = {}) {
        let listeners = DEEP_LISTENERS[eventname];
        if (listeners) {
            let i = listeners.indexOf(listener);
            if (i > -1) listeners.splice(i, 1);
        }
    }

    removeAllDeepListeners(eventname) {
        if (eventname) {
            delete DEEP_LISTENERS[eventname];
        }
    }

    static getDeepListeners() {
        return DEEP_LISTENERS;
    }

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
        return this.target?.length ?? Reflect.ownKeys(this.target ?? {}).length ?? 0;
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
