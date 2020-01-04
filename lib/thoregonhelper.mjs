/**
 * helper methods
 *
 * @author: Bernhard Lukassen
 */

import { bootlogger }   from './bootutil.mjs';

export const myuniverse = () => {
    // this is a cryptic way to get the 'global' object or 'window' in strict mode. direct code references will throw an error
    // const space = (1,eval)("this");
    // todo: always provide a evolux.universe
    return globalThis.universe ? globalThis.universe : globalThis;
};

export const myevolux = () => {
    const universe = myuniverse();
    if (!universe.evolux) universe.evolux = {};
    return universe.evolux;
};

export const mythoregon = () => {
    const universe = myuniverse();
    if (!universe.thoregon) universe.thoregon = {};
    return universe.thoregon;
};

export const myterra = () => {
    const universe = myuniverse();
    if (!universe.terra) universe.terra = {};
    return universe.terra;
};

// the delegate can later be exchanged by a more sophisticated logger
export const logger = {
    _delegate: bootlogger,

    log(level, ...message) {
        // todo: print timestamp formated
        this._delegate.log(level, ':', ...message);
    },

    info(...message) {
        this._delegate.info(...message);
    },

    warn(...message) {
        this._delegate.warn(...message);
    },

    error(note, err, ...message) {
        this._delegate.error(note, err, ...message);
    },

    debug(...message) {
        this._delegate.debug(... message);
    }

};

export const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// just push back to the event loop and perform following steps 'async' (simulated)
export const doAsync = () => timeout(0);

