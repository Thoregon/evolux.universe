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

import { bootlogger }   from './bootutil.mjs';
import { unload }       from '/evolux.universe';

// don't show a warning when this properties of the universe will be overwritten
const noWarnProps = ['logger', 'stage'];

// this is the max timeout for dusk before universe freezes
const MAX_DUSK_TIMEOUT = 15000;

class Universe {

    constructor() {
        /** @type {Object<String,*>} default ... object to store all default exports from config scripts  */
        this.default = {};
        /** @type {Object<String,*>} options */
        this._env = {}; //this._env();
        // first register end of process to do the dusk
        /** @type {Function} stop listening on exit function. */
        this._stopListenDusk = unload.add(() => this.freeze() );
        /** @type {Array<Function>} hooks */
        this._hooksDawn = [];
        /** @type {Array<Function>} hooks */
        this._hooksDusk = [];
        this._codes = [];

        // collect the native properties of the universe which are reserved (all properties defined above including '_reserved' itself.
        this._reserved = "";
        this._reserved = Object.keys(this).concat(Object.getOwnPropertyNames(this.constructor.prototype));
        // todo: add this.constructor.prototype function names
        this.logger = bootlogger;

        // these properties can be overwritten, not reserved
        this.universeFile = undefined;
        this.stage = undefined;
        // just init logger as long as the service overwrites it
        this.logger.debug("$$ universe: instantiation end");
    }

    /**
     * returns the environment (from the shell)
     * @return {Object<string, *>} env
     */
    get env() {
        return this._env;
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

    apply(protouniverse) {
        if (protouniverse.timeout4dawn) this.timeout4dawn = protouniverse.timeout4dawn;

        let hooks = protouniverse.getHooks();
        if (hooks.hooksDawn) this._hooksDawn = this._hooksDawn.concat(hooks.hooksDawn);
        if (hooks.hooksDusk) this._hooksDusk = this._hooksDusk.concat(hooks.hooksDusk);

        // now transfer all properties except private
        for (let property in protouniverse) {
            if (protouniverse.hasOwnProperty(property) && !property.startsWith('_') && !this.isReserved(property)) this.register(property, protouniverse[property]);
        }
    }

    /**
     * Register a setting or resource on the universe
     * @param {String} name - the name of the resource
     * @param {Object} object - the resource or setting
     */
    register(name, object) {
        if (this.isReserved(name)) return false;
        this[name] = object;
        this.logger.debug(`$$ universe: registered -> ${name}`);
        return true;
    }

    /**
     * Register a default setting or resource on the universe
     * will contain the default exporst from config scripts
     * @param {String} name - the name of the resource
     * @param {Object} object - the resource or setting
     */
    registerDefault(name, object) {
        if (this.default[name]) this.logger(`$$ universe: default for config '${name}' already registered, will be overwritten!`);
        this.default[name] = object;
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
        if (this._hooksDawn.indexOf(hookfn) > -1) {
            this.logger.log('warn', `universe: dawn hook ${hookfn.name} already registered`);
            return;
        }
        this._hooksDawn.push(hookfn);
        this.logger.debug("$$ universe: added dawn hook");
    }

    /**
     * Register hook functions to be executed when universe freezes (at dusk).
     * Can be async, waits until all hooks have returned,
     * so be careful what you do.
     * @param {Function} hookfn
     */
    atDusk(hookfn) {
        if (this._hooksDusk.indexOf(hookfn) > -1) {
            this.logger.log('warn', `universe: dusk hook ${hookfn.name} already registered`);
            return;
        }
        this._hooksDusk.push(hookfn);
        this.logger.debug("$$ universe: added dusk hook");
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
    letThereBeLight() {
        var logger = this.logger;
        var fns = this._hooksDawn;
        logger.debug("$$ universe: letThereBeLight start");

        let timeout4dawn = this._timeout4dawn
                        ? setTimeout(() => this.freeze(), this._timeout4dawn)
                        : 0;

        // do the dawn async
        return new Promise((fulfill, reject) => {
            logger.debug("$$ universe: letThereBeLight resolve");
            let proms = [];
            try {
                fns.forEach(f => {
                    // check if result is a Promise (there is no better way!), otherwise wrap the result with a Promise
                    proms.push(Promise.resolve(f(this)));
                });
            } catch (e) {
                logger.error(`%% universe: letThereBeLight: error at dawn hook: "${e}"`);
                reject();
            }
            Promise.all(proms)
                .then(() => {
                    if (timeout4dawn) clearTimeout(timeout4dawn);
                    logger.debug("$$ universe: letThereBeLight resolve end");
                    fulfill();
                })
                .catch(err => {
                    this.freeze();
                });
        });
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

    /**
     * Stops the universe by freezing it. The oposite of 'letThereBeLight'.
     * The will be a timeout of max 15 seconds before the universe will be freezed
     * This timeout can't be changed or switched off!
     * Does not provide any hook for after 'dusk' because the universe is then freezed
     *
     */
    freeze() {
        var logger = this.logger;
        var fns = this._hooksDusk;
        logger.debug("$$ universe: freeze start");

        let duskTimeout = setTimeout(() => this._abort(), MAX_DUSK_TIMEOUT );

        // do the dusk async
        Promise.resolve(() => {
            logger.debug("$$ universe: freeze resolve");
            let proms = [];
            try {
                fns.forEach(f => {
                    let prom = f(this);
                    // check if result is a Promise (there is no better way!), otherwise wrap the result with a Promise
                    proms.push((prom && typeof prom.then === 'function') ? prom : Promise.resolve(prom));
                });
            } catch (e) {
                logger.error(`%% universe: letThereBeLight: error at dusk hook: "${e}"`);
            }

            Promise.all(proms)
                .then(() => {
                    if (duskTimeout) clearTimeout(duskTimeout);
                    logger.debug("$$ universe: freeze resolve end");
                });
        });
    }

    _env() {
        return process ? process.env : {};
    }

    _exit(n) {
        if (process) process.exit(n);
    }

    _abort() {
        if (process) process.abort();
    }
}

// export a singleton
export default new Universe();
