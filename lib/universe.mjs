/**
 * The Universe is the runtime context for the platform.
 * It has properties for every setting used by the eWINGZ platform
 * and returns proper defaults.
 *
 * Acts a Dependency Injection Registry.
 *
 * For proper recording first setup a logger in your config script.
 * Default logging to console
 *
 * @author: blukassen
 */

// Caution: This is a kind of starting point!
// It must be possible to 'require' the universe from any component of the platform.
// Don't import other compoments or modules from the platfrom to avoid circle requires
// Import only modules which are directly installed and do not reference any element from the 'configurations'.

import { forEach,
         isFunction,
         className }                from '/evolux.util';
import { DeferredProperties,
         hasDeferredProperty,
         notifyDeferredProperty }   from './deferredproperties.mjs';

import { logger,
         timeout,
         doAsync,
         halt }         from './thoregonhelper.mjs';
import { unload, rnd, rndnum, dataurl }  from '/evolux.universe';

import AccessObserver from './accessobserver.mjs';
import EError         from "/evolux.supervise/lib/error/eerror.mjs";
import { installT͛ }   from "../vanillaT.mjs";
import * as util      from '/evolux.util';

export const ErrNotImplemented              = (msg)         => new EError(`Not implemented ${msg}`,           "IDENTITY:00000");

// don't show a warning when this properties of the universe will be overwritten
const noWarnProps = ['logger', 'stage'];

let nowfn = () => Date.now();

// this is the max timeout for dusk before universe freezes
const MAX_DUSK_TIMEOUT = 15000;

const T = 't͛';     // meta data property name

let _sealed = false;

//
// logging & debugging
//

let DBGIDS = new Set();
let logentries = [];

//
// annoations
//

const annotations = [];

/**
 *
 */
class Universe extends DeferredProperties(Object) {

    constructor() {
        super();
        this._inflated = false;

        // publish special methods
        this.timeout   = timeout;
        this.doAsync   = doAsync;
        this.forEach   = forEach;
        this.className = className;
        this.mckup     = {};        // a place to collect all mockups

        /** @type {Object<String,*>} options */
        this.env                = AccessObserver.observe({}, this);
        // first register end of process to do the dusk
        /** @type {Function} stop listening on exit function. */
        this._stopListenDusk    = unload.add((code) => this.freeze(code));
        // handle uncaught exceptions
        unload.uncaught((err) => this.handleUncaught(err));
        /** @type {Array<Function>} hooks */
        this._hooksDawn         = [];
        /** @type {Array<Function>} hooks */
        this._hooksDusk         = [];
        this._codes             = [];
        this._listeners         = {};
        this.$universe          = this;
        this.random             = rnd;
        this.rndnum             = rndnum;
        this.util               = { ...util, doAsync, timeout, halt, ...dataurl };

        // collect the native properties of the universe which are reserved (all properties defined above including '_reserved' itself.
        this._reserved          = "";
        this._reserved          = ['͛device'].concat(Object.keys(this)).concat(Object.getOwnPropertyNames(this.constructor.prototype));
        // todo: add this.constructor.prototype function names
        this.logger             = logger;

        // these properties can be overwritten, not reserved
        this.stage              = undefined;
        // just init logger as long as the service overwrites it
        this.logger.debug("$$ universe: instantiation end");
    }

    get ErrNotImplemented() {
        return ErrNotImplemented;
    }

    wait4(conditionfn) {
        return new Promise(resolve => {
            while (!conditionfn()) timeout(100);
            resolve();
        });
    }

    get hasUI() {
        return !!(globalThis.window);
    }

    get T() {
        return T;
    }

    isWebAuthnSupported() {
        return !!(window.PublicKeyCredential);
    }

    async isPasskeySupported() {
        try {
            // Note: try-catch does the availability checks for window.PublicKeyCredential, PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable and PublicKeyCredential.isConditionalMediationAvailable
            if (!await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()) return false;
            if (!await PublicKeyCredential.isConditionalMediationAvailable()) return false;
            return true;
        } catch (e) {
            // logger.error(e);
            return false;
        }
    }

    supportsSharedWorker() {
        try {
            return false; // !!window.SharedWorker;
        } catch (ignore) {}
        return false;
    }

    supportsWorkerTypeModule() {
        let supports = false;
        const tester = {
            get type() { supports = true; } // it's been called, it's supported
        };
        try {
            // We use "blob://" as url to avoid an useless network request.
            // This will either throw in Chrome
            // either fire an error event in Firefox
            // which is perfect since
            // we don't need the worker to actually start,
            // checking for the type of the script is done before trying to load it.
            const worker = new Worker('blob://', tester);
        } finally {
            return supports;
        }
    }

    //
    // debugging & logging
    //

    formatDate(date) {
        let datePart = [
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate(),
        ].map((n, i) => n.toString().padStart(i === 0 ? 4 : 2, "0")).join("-");
        let timePart = [
            date.getHours(),
            date.getMinutes(),
            date.getSeconds(),
        ].map((n, i) => n.toString().padStart(2, "0")).join("");
        return datePart + "_" + timePart + '_' + date.getMilliseconds();
    }

    debuglog(id, msg, ...args) {
        const _this = this.$universe;
        if (!_this.logDbgId(id)) return;
        if (_this.DEBUGCONSOLE) _this.logger.log(id, _this.inow, ':', msg, ...args);
        const logentry = { id, dttm: _this.inow, msg, args };
        logentries.push(logentry);
    }

    logDbgId(id) {
        return this.debugids.has(id) || id === ">> Universe";
    }

    get debugids() {
        // const _this = this.$universe;
        // if (!DBGIDS) DBGIDS = new Set(_this.DEBUGIDS ?? []);
        return DBGIDS;
    }

    getlog(filter) {
        return filter
               ? logentries.filter(filter)
               : logentries;
    }

    clearlog() {
        logentries = [];
    }

    async _writeLog_(haderror, tag) {
        const items = logentries.map(item => `${item.id} : ${item.dttm} : ${item.msg} - ${JSON.stringify(item.args)}`);
        let   str = items.join('\n');
        if (haderror) {
            str += `\n\n----ERROR -------------\n${JSON.stringify(haderror)}`;
        }
        const logname = `neuland_${this.inow}${haderror ? '_E' : ''}${tag ? '_'+tag : ''}`;
        if (this.DEBUGCONSOLE) console.log(str);
        if (this.logsink) {
            await this.logsink.capture(logname, str, logentries);
        }
        logentries = [];
    }

    genlog(tag) {
        const _this = this.$universe;
        _this._writeLog_(false, tag);
    }

    async readlog(name) {
        const log = await this.logsink.getlog(name);
        return log;
    }

    //
    // annotations
    //

    checkinAnnotation({ url } = {}, annotation, name) {
        if (globalThis.dorifer) {
            dorifer.checkinAnnotation({ url }, annotation, name)
        } else {
            annotations.push({ url, annotation, name });
        }
    }

    preAnnotations() {
        const def = [...annotations];
        // clear annotations
        return def;
    }

    /**
     * get the property async.
     *
     * @param query
     * @return {Promise<*>}
     */
    async with(query) {
        return this._with(query, this);
    }

    /**
     * loop async recursive thru the properties and retrieve the requested
     *
     * @param query
     * @param base
     * @return {Promise<*>}
     * @private
     */
    async _with(query, base) {
        if (!query) return;
        const parts = query.split('.');
        if (!parts.length) return;
        const name = parts.splice(0, 1);    // get first name
        let item = this[name];

        // if there is no item and it is this a deferred property wait for it and continue loop
        if (!item && hasDeferredProperty(base)) {
            return await this._with(query, await base.deferredProperty(name));
        }

        // if the property is a function execute it
        if (isFunction(item)) item = await item();

        // end of loop reached or loop again
        return (parts.length)
            ? await this._with(parts.join('.'), item)
            : item;
    }

    /**
     * defines a global
     * does not override existing
     *
     * todo [OPEN]: check permission
     * @param name
     * @param [entity]  if omitted, the property of universe will be used
     * @param { { add2universe: boolean, doThrow: boolean, modifiable: boolean } } settings
     */
    global(name, entity, { add2universe = false, doThrow = false, modifiable = false } = {}) {
        entity = entity || this[name];
        if (entity == undefined) return this;
        if (globalThis[name]) {
            if (doThrow) throw Error(`Global '${name}' can't be redefined`);
            logger.warn(`Global '${name}' can't be redefined`);
            return;
        }

        if (add2universe) this.register(name, entity, true); // don't need to wrap it with an observer

        Object.defineProperty(globalThis, name, { value: entity, configurable: modifiable, enumerable: true, writable: modifiable });
        return this;
    }

    /**
     * Check if the 'name' is reserved within this universe
     * @param name
     * @returns {boolean}
     */
    isReserved(name) {
        return (this._reserved.indexOf(name) > -1);
    }

    /**
     * Check if the 'name' is registered in this universe and can be defined
     * @param name
     * @returns {boolean}
     */
    isRegistered(name) {
        return noWarnProps.indexOf(name) < 0 && !!this[name];
    }

/*
    applyProto(protouniverse) {
        if (!protouniverse) return;
        const _this = this.$universe;
        if (protouniverse.timeout4dawn) this.timeout4dawn = protouniverse.timeout4dawn;

        let hooks = protouniverse.getHooks();
        if (hooks.dawn) _this._hooksDawn = _this._hooksDawn.concat(hooks.dawn);
        if (hooks.dusk) _this._hooksDusk = _this._hooksDusk.concat(hooks.dusk);

        // now transfer all properties except private
        for (let property in protouniverse) {
            if (protouniverse.hasOwnProperty(property) && !property.startsWith('_') && !_this.isReserved(property)) _this.register(property, protouniverse[property]);
        }
    }
*/

    /**
     * Register a setting or resource on the universe
     * @param {String} name - the name of the resource
     * @param {Object} object - the resource or setting
     */
    register(name, object, bare) {
        const _this = this.$universe;
        if (_this.isReserved(name)) return false;
        if (name === '$nowfn') {
            _this.useNow(object);
            return;
        }
        if (name === 'DEBUGIDS') {
            DBGIDS = new Set(object ?? []);
        }
        // allow unobserved objects to be registereds
        if (name.startsWith('$')) {
            bare = true;
            name = name.substr(1);
        }
        _this[name] = bare
            ? object
            : AccessObserver.observe(object, _this);
        notifyDeferredProperty(_this, name, object);
        _this.emitGlobalEvent(name, object);
        _this.logger.debug(`$$ universe: registered -> ${name}`);
        return true;
    }

    /**
     * Register a default setting or resource on the universe
     * will contain the default exporst from config scripts
     * @param {String} name - the name of the resource
     * @param {Object} object - the resource or setting
     */
    registerDefault(name, object) {
        const _this = this.$universe;
        if (_this.default[name]) _this.logger(`$$ universe: default for config '${name}' already registered, will be overwritten!`);
        _this.default[name] = object;
    }

    /**
     * add codes for errors, notifications and messages
     * @param {Object<String, String>} codes
     */
    addCodes(codes) {
        this.logger.debug("$$ universe: added codes");
    }

    /**
     * Register hook functions to be executed when inflation ends (at dawn).
     * Can be async, inflation waits until all hooks have returned,
     * so be careful what you do.
     * @param {Function} hookfn
     */
    atDawn(hookfn) {
        const _this = this.$universe;
        if (_this._hooksDawn.indexOf(hookfn) > -1) {
            _this.logger.log('warn', `universe: dawn hook ${hookfn.name} already registered`);
            return;
        }
        _this._hooksDawn.push(hookfn);
        _this.logger.debug("$$ universe: added dawn hook");
    }

    /**
     * Register hook functions to be executed when universe freezes (at dusk).
     * Can be async, waits until all hooks have returned,
     * so be careful what you do.
     * @param {Function} hookfn
     */
    atDusk(hookfn) {
        const _this = this.$universe;
        if (_this._hooksDusk.indexOf(hookfn) > -1) {
            _this.logger.log('warn', `universe: dusk hook ${hookfn.name} already registered`);
            return;
        }
        _this._hooksDusk.push(hookfn);
        _this.logger.debug("$$ universe: added dusk hook");
    }

    /**
     * Start the inflation phase of the universe,
     * returns after the dark ages and leaves
     * a well-established runtime environment.
     * Iterates over the 'inflation-hooks' in the order they where registered.
     * Each hook get this universe as parameter.
     * Hook Fn's can be async, inflation waits until all hooks have returned.
     * If a hook fails the process fails.
     * Will be called at the end of the 'init' module

     * @returns {Promise}   put your code to 'then()', will be invoked after dawn (when there is light)
     */
    async letThereBeLight() {
        await this.establishAnchors();
        await doAsync();    // first let the JS loop work all queued requests

        installT͛();

        const _this = this.$universe;
        var logger = _this.logger;
        var fns = _this._hooksDawn;
        logger.debug("$$ universe: letThereBeLight start");

        let timeout4dawn = _this._timeout4dawn
            ? setTimeout(() => _this.freeze(), _this._timeout4dawn)
            : 0;

        // do the dawn async
        logger.debug("$$ universe: letThereBeLight resolve");
        try {
            // run all fns hooked for dawn
            await forEach(fns, async (fn) => await fn(this));

            if (timeout4dawn) clearTimeout(timeout4dawn);
            logger.debug("$$ universe: letThereBeLight resolve end");
            logger.info("$$ Universe inflated, dark age overcome");
            _this._inflated = true;

            // activate firewalls
            await _this.activateFirewalls();

            // tell every registered item which is interested that the universe is inflated
            await forEach(Object.entries(this), async ([name, item]) => {
                try { if (item && item.inflated && isFunction(item.inflated)) await item.inflated() } catch (e) { logger.error("$$ Inflated", name, e) }
            });

            return this;
        } catch (err) {
            logger.error(`%% universe: letThereBeLight: error at dawn hook`, err);
            return await _this.freeze();
            throw err;
        }
    }

    async activateFirewalls() {
        // todo [OPEN]: now activate firewalls, seal global objects (especially locally stored identity data)
        _sealed = true;
        thoregon.activateFirewalls?.();
    }

    get notSealed() {
        if (_sealed) throw Error("universe inflated, can't modify");
    }

    /**
     * each device will get its own identifier.
     * establish this identifier if missing
     * and store it locally
     *
     * @return {Promise<void>}
     */
    async establishAnchors() {
        // define a unique identifier for this installation. Used to identify tasks and objects created by this installation
        let z = await baseDB.get('tdevice');
        if (!z) {
            z = rnd();
            baseDB.set('tdevice', z);   // doesn't need to await
        }
        this.t͛device = z;
    }

    /**
     * just meant for testing. Shuold not be neccessary in production
     *
     * @param seconds
     */
    set timeout4dawn(seconds) {
        let msecs = seconds * 1000;
        this._timeout4dawn = msecs;
    }

    handleUncaught(evt) {
        // halt();
        // this.logger.error("$$ universe:", err?.message);
        logger.error("Unhandled Exception:", evt);
        this.debuglog(">> Universe", "Unhandled Exception", evt);
        if (this.LOGUNCAUGHT) this._writeLog_(evt);
    }

    /**
     * Stops the universe by freezing it. The oposite of 'letThereBeLight'.
     * The will be a timeout of max 15 seconds before the universe will be freezed
     * This timeout can't be changed or switched off!
     * Does not provide any hook for after 'dusk' because the universe is then freezed
     *
     */
    async freeze(code) {
        const _this = this.$universe;
        var logger = _this.logger;
        var fns = _this._hooksDusk;
        logger.debug("$$ universe: freeze start");

        let duskTimeout = setTimeout(() => _this._abort(), MAX_DUSK_TIMEOUT);

        // do the dusk async
        logger.debug("$$ universe: freeze resolve");
        let proms = [];
        try {
            await forEach(fns, async (fn) => await fn(this, code));
            if (duskTimeout) clearTimeout(duskTimeout);
            logger.debug("$$ universe: freeze resolve end");
        } catch (err) {
            logger.error(`%% universe: freeze: error at dusk hook`, err);
        }
        // await this._writeLog_();

        _this._exit(1);
    }

    _env() {
        return globalThis.process ? process.env : {};
    }

    _exit(n) {
        if (globalThis.process) globalThis.process.exit(n);
    }

    _abort() {
        if (globalThis.process) globalThis.process.abort();
    }

    //
    // State
    // todo [OPEN]: implement state like GUN state -> gun/state.js
    //

    get state() {
        return this.now;
    }

    /*
     * Time
     */

    get now() {
        return new Date(nowfn());
    }

    get inow() {
        return nowfn();
    }

    get nowFormated() {
        return this.formatDate(this.now);
    }

    useNow(fn) {
        nowfn = fn;
    }

    get nowfn() {
        return nowfn;
    }

    /*
     * observables
     */

    observe(object) {
        return AccessObserver.observe(object);
    }

    isObserved(object) {
        return AccessObserver.isObserved(object);
    }

    /*
     * first level property listeners
     */

    /**
     *
     * @param eventname
     * @param fn
     * @param once
     */
    addListener(eventname, fn, once) {
        let listeners = this._listeners[eventname];
        if (!listeners) {
            listeners = [];
            this._listeners[eventname] = listeners;
        }
        if (once) fn.once = true;
        listeners.push(fn);
    }

    removeListener(eventname, fn) {
        let listeners = this._listeners[eventname];
        if (!listeners) return;
        let i = listeners.indexOf(fn);
        if (fn > -1) listeners.splice(i, 1);
    }

    emitGlobalEvent(eventname, object) {
        const _this = this.$universe;
        if (!_this._inflated) return;
        if (globalThis.document && globalThis.document.dispatchEvent) globalThis.document.dispatchEvent(new CustomEvent(eventname === 'universe' ? 'universe' : `universe.${eventname}`, { detail: object }));
        let listeners = _this._listeners[eventname];
        if (!listeners) return;
        let remove = [];
        listeners.forEach(async (fn) => {
            if (fn.once) remove.push(fn);
            try {
                await fn(object);
            } catch (e) {
                _this.logger.error('universe property event handler', e);
            }
        });
        remove.forEach(fn => _this.removeListener(eventname, fn));
    }

    emitAllGlobalEvents() {
        const _this = this.$universe;
        _this.emitGlobalEvent('universe', this);
        let names = Object.keys(_this).filter(key => _this._reserved.indexOf(key) === -1);
        names.forEach(name => _this.emitGlobalEvent(name, _this[name]));
    }

    /*
     * Components
     * todo: move to a plugin
     *  todo: define 'universe' and 'thoregon' events
     */

    /**
     * Pass a collection of component descriptors to add it.
     * @param components
     */
    addComponents(components) {
        const _this = this.$universe;
        let controller = this.services.components;
        if (controller) controller.installAll(components);
    }

    //
    // module helpers
    //

    async module(path) {
        return await import(path);
    }

    async moduleItem(path, name) {
        const module = await this.module(path);
        return module[name];
    }

    async moduleDef(path, name) {
        const module = await this.module(path);
        return module.default;
    }

}

/*
 * Proxy implementation
 */

const decorator = {
    ownKeys: (obj) => {
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

    val: (target, receiver) => {
        return target;
    },

/*
    path: (accesspath) => {
        return new Promise((resolve, reject) => {
            try {
                let workpath = Array.isArray(accesspath) ? accesspath : accesspath.split('.');      // todo:

            } catch (e) {
                reject(e);
            }
        });
    }
*/
};

const handler = {

    get(target, prop, receiver) {
        if (prop === '$universe') return target;
        if (decorator.hasOwnProperty(prop)) return decorator[prop](target, receiver);
        if (prop.startsWith('_')) return undefined;
        let value =  Reflect.get(target, prop, receiver);
        // if (isFunction(value)) value = new Proxy(value, fnhandler);
        return value;
    },

    set(target, prop, value, receiver) {
        if (prop === '$universe') return;
        target.register(prop, value);
        return true;
    },

    ownKeys (target) {
        let keys = Reflect.ownKeys(target);
        return keys.filter(key => !key.startsWith('_') && !key.startsWith('$'));
    }
};

// export a singleton
let universe = new Universe();
let puniverse = new Proxy(universe, handler);
// publish universe with property handler
Object.defineProperty(globalThis, 'universe', {
    configurable: false,
    enumerable  : true,
    writable    : false,
    value       : puniverse
})
export default puniverse;
