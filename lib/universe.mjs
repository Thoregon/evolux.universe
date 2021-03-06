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

import { logger, timeout, doAsync } from './thoregonhelper.mjs';
import { unload, rnd }              from '/evolux.universe';
import AccessObserver               from './accessobserver.mjs';

// don't show a warning when this properties of the universe will be overwritten
const noWarnProps = ['logger', 'stage'];

let nowfn = () => new Date();

// this is the max timeout for dusk before universe freezes
const MAX_DUSK_TIMEOUT = 15000;

const T = 't͛';     // meta data property name

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
        this._stopListenDusk    = unload.add(() => this.freeze());
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

        // define a unique identifier for this installation. Used to identify tasks and objects created by this installation
        let z                   = localStorage.getItem('tzodiac');
        if (!z) {
            z = rnd();
            localStorage.setItem('tzodiac', z);
        }
        this.t͛zodiac            = z;

        // collect the native properties of the universe which are reserved (all properties defined above including '_reserved' itself.
        this._reserved          = "";
        this._reserved          = Object.keys(this).concat(Object.getOwnPropertyNames(this.constructor.prototype));
        // todo: add this.constructor.prototype function names
        this.logger             = logger;

        // these properties can be overwritten, not reserved
        this.stage              = undefined;
        // just init logger as long as the service overwrites it
        this.logger.debug("$$ universe: instantiation end");
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
     * @param entity
     */
    defineGlobal(name, entity) {
        if (globalThis[name]) throw Error(`Global '${name}' can't be redefined`);
        Object.defineProperty(globalThis, name, { value: entity, configurable: false, enumerable: true, writable: false });
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
    register(name, object) {
        const _this = this.$universe;
        if (_this.isReserved(name)) return false;
        if (name === '$nowfn') {
            _this.useNow(object);
            return;
        }
        // allow unobserved objects to be registereds
        let bare = name.startsWith('$');
        if (bare)  name = name.substr(1);
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
        await doAsync();    // first let the JS loop work all queued requests

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
            await forEach(fns, async (fn) => await fn(this));
            if (timeout4dawn) clearTimeout(timeout4dawn);
            logger.debug("$$ universe: letThereBeLight resolve end");
            logger.info("$$ Universe inflated, dark age overcome");
            _this._inflated = true;
            return this;
        } catch (err) {
            logger.error(`%% universe: letThereBeLight: error at dawn hook`, err);
            return await _this.freeze();
        }
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

    handleUncaught(err) {
        this.logger.error("$$ universe:", err);
    }

    /**
     * Stops the universe by freezing it. The oposite of 'letThereBeLight'.
     * The will be a timeout of max 15 seconds before the universe will be freezed
     * This timeout can't be changed or switched off!
     * Does not provide any hook for after 'dusk' because the universe is then freezed
     *
     */
    async freeze() {
        const _this = this.$universe;
        var logger = _this.logger;
        var fns = _this._hooksDusk;
        logger.debug("$$ universe: freeze start");

        let duskTimeout = setTimeout(() => _this._abort(), MAX_DUSK_TIMEOUT);

        // do the dusk async
        logger.debug("$$ universe: freeze resolve");
        let proms = [];
        try {
            await forEach(fns, async (fn) => await fn(this));
            if (duskTimeout) clearTimeout(duskTimeout);
            logger.debug("$$ universe: freeze resolve end");
        } catch (err) {
            logger.error(`%% universe: freeze: error at dusk hook`, err);
        }

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

    /*
     * Time
     */

    get now() {
        return nowfn();
    }

    useNow(fn) {
        nowfn = fn;
    }

    /*
     * observables
     */

    observe(object) {
        return AccessObserver.observe(object);
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
        if (globalThis.document && globalThis.document.dispatchEvent) globalThis.document.dispatchEvent(new CustomEvent(  `universe.${eventname}`, { detail: object }));
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
