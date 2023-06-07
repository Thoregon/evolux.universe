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

let EXCLUDEDPROPS = ['constructor', 'target', 'parent', '_mths', '_eventListeners', '_deepListeners', '_forwardDeepEvents'];

let baseobserverproerties = [], baseobservermethods = [];

const isPrivateProperty = (property) => !isString(property) ? true :  property.startsWith('_') || property.startsWith('$') || property.endsWith('_') || property.endsWith('$');

const DBGID = '== AccessObserver';

const UNIVERSE = () => globalThis.universe ? universe : { debuglog: () => {}, logger: { warn: (...args) => console.log(DBGID, ...args) } };

globalThis.accesslog = [];
const debuglog = (...args) => { globalThis.accesslog.push({ id: DBGID, ...args }) }; // console.log("## AccessObserver", ...args);

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
        let opt    = args[1] ?? { create: false, load: false};
        // can observe only Objects with a Proxy
        if (!target) return;
        if (typeof target !== 'object') return target;
        if (this.isObserved(target)) return target;

        const handler = new this(...args);
        const proxy = new Proxy(target, handler);
        handler.proxy$ = proxy;
        handler.__adjustTarget__(proxy);
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
        return this.constructor.isObserved(target ?? this);
    }

    /**
     * observe the 'sub' object which is set to a property
     *
     * @param target
     * @param parent
     * @return {any}
     */
    decorate(target, parent, prop) {
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
        let oldValue = Reflect.get(target, prop, receiver);
        value = this.beforeSet(target, prop, value, receiver, opt = {}) || value;
        let modified = this.doSet(target, prop, value, receiver, opt = {});
        this.afterSet(target, prop, value, receiver, opt = {});

        if (modified && !isPrivateProperty(prop) && !this.dontEmit(prop)) this.emit('change', { type: 'change', obj: receiver, property: prop, newValue: value, oldValue });

        target.metaClass?.emitEntityEvents(receiver);

        return true;
    }

    beforeSet(target, prop, value, receiver, opt = {}) {}

    doSet(target, prop, value, receiver, opt = {}) {
        Reflect.set(target, prop, value, receiver);
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
            let oldValue = Reflect.get(target, prop, receiver);
            // todo [OPEN]: introduce 'beforeChange' event handler to be able to prevent delete
            this.beforeDelete(target, prop, oldValue, receiver, opt);
            let modified = this.doDelete(target, prop, receiver, opt);
            this.afterDelete(target, prop, receiver, opt);
            if (modified && !isPrivateProperty(prop) && !this.dontEmit(prop)) this.emit('change', { type: 'delete', obj: this.proxy$, property: prop, oldValue, newValue: undefined });
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
            listeners?.forEach(listener => {
                try {
                    if (listener._opt?.once) remove.push(listener);
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

    hasDeepListeners() {
        // return false;
        const found = Object.values(this._deepListeners ?? {}).find((listeners) => !listeners.is_empty);
        return !!found || this._forwardDeepEvents.length > 0;
    }

    /**
     * invoked when a property is changed
     * if it is an object and this has deep listeners, add forward event
     * @param prop
     * @private
     */
    __checkDeepListeners__(parent, prop, options = {}) {
        const found = this._forwardDeepEvents.find((listener) => listener.parent === parent);
        if (!found) {
            UNIVERSE().debuglog(DBGID, "checkDeepListeners", prop);
            this._forwardDeepEvents.push({ parent, prop });
        }
        this.__addDeepListenersOnProperties__(options)
    }

    __wrap__(prop, value) {
        if (value && !isPrivateProperty(prop) && !this.constructor.isObserved(value) && isRef(value)) return this.decorate(value, this.proxy$, prop);
        return value;
    }

    beforeSet(target, prop, value, receiver) {
        super.beforeSet(target, prop, value, receiver);
        value = this.__wrap__(prop, value);
        if (this.hasDeepListeners()) value?.__checkDeepListeners__?.(this.proxy$, prop);
        return value
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
        UNIVERSE().debuglog(DBGID, "addDeepListener", eventname);
        this.__addDeepListenersOnProperties__(options);
    }

    __addDeepListenersOnProperties__(options = {}) {
        const properties = Object.keys(this.target).filter((prop) => !isPrivateProperty(prop)); // all existing properties w/o private
        const receiver   = this.proxy$;
        if (!options.entities) options.entities = new Set();
        properties.forEach((prop) => {
            if (options.omit?.includes(prop)) return;
            const value = receiver[prop];
            if (options.entities.has(value)) return;
            options.entities.add(value);
            value?.__checkDeepListeners__?.(receiver, prop, options);
        });
    }

    __emitDeep__(eventname, details, options = {}) {
        if (!this._forwardDeepEvents?.is_empty) {
            if (!options.entities) options.entities = new Set();
            this._forwardDeepEvents.forEach(({ parent, prop }) => {
                if (options.entities.has(parent)) return;
                options.entities.add(parent);
                details.property = details.property ? `${prop}.${details.property}` : prop ;
                parent?.__emitDeep__(eventname, details, options);
            })
        // } else {
        //     this.emitFromDeep(eventname, details, opt);
        }
        this.emitFromDeep(eventname, details, options);
    }

    emitFromDeep(eventname, details, opt = {}) {
        let listeners = this._deepListeners[eventname];
        // if (!listeners || listeners.length === 0) return;
        if (opt?.once && listeners) delete this._deepListeners[eventname];
        (async (listeners, eventname, details, opt) => {
            doAsync();
            if (listeners) debuglog("emitFromDeep", this, eventname, details);
            const remove = [];
            listeners?.forEach(listener => {
                try {
                    if (listener._opt?.once) remove.push(listener);
                    listener(Object.assign({}, details));
                } catch (e) {
                    UNIVERSE().logger.warn('Mutation Listener cased an error', e);
                }
            })
            // todo: remove deep listeners for 'once' events (remove.forEach((listener) => this.removeDeepListener(eventname, listener));)
        })(listeners, eventname, details, opt);
    }

    removeDeepListener(eventname, listener) {
        let listeners = this._deepListeners[eventname];
        if (listeners) {
            let i = listeners.indexOf(listener);
            if (i > -1) listeners.splice(i, 1);
        }
        this.__removeDeepListenerOnProperties__();
    }

    __removeDeepListenerOnProperties__() {
        const properties = Object.keys(this.target).filter((prop) => !isPrivateProperty(prop)); // all existing properties w/o private
        const receiver   = this.proxy$;
        properties.forEach((prop) => {
            const value = receiver[prop];
            value?.__checkRemoveDeepListeners__?.(receiver, prop);
        });
    }

    __checkRemoveDeepListeners__(parent, prop) {
        const i = this._forwardDeepEvents.findIndex((listener) => listener.parent === parent);
        if (i > -1) this._forwardDeepEvents.splice(i, 1);
        this.__removeDeepListenerOnProperties__()
    }

    removeAllDeepListeners(eventname) {
        if (eventname) {
            delete this._deepListeners[eventname];
        } else {
            this._deepListeners = {};
        }
        this.__removeDeepListenerOnProperties__(eventname);
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
