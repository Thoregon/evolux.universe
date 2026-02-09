/**
 * The Server Universe is the runtime context for the platform.
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

import Universe     from "./universe.mjs";
import dependencies from "./sovereign/dependencies.mjs"

// Caution: This is a kind of starting point!
// It must be possible to 'require' the universe from any component of the platform.
// Don't import other compoments or modules from the platfrom to avoid circle requires
// Import only modules which are directly installed and do not reference any element from the 'configurations'.

/**
 *
 */
class UniverseS extends Universe {

    constructor() {
        super(dependencies);
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
let universe = new UniverseS();
let puniverse = new Proxy(universe, handler);
// publish universe with property handler
Object.defineProperty(globalThis, 'universe', {
    configurable: false,
    enumerable  : true,
    writable    : false,
    value       : puniverse
})
export default puniverse;
