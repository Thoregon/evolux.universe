/**
 * helper methods
 *
 * @author: Bernhard Lukassen
 */

import { bootlogger }   from './bootutil.mjs';

export const myevolux = () => {
    const universe = universe;
    if (!universe.evolux) universe.evolux = {};
    return universe.evolux;
};

export const tservices = () => {
    if (!universe.services) universe.services = {};
    return universe.services;
};

export const mythoregon = () => {
    const universe = universe;
    if (!universe.thoregon) universe.thoregon = {};
    return universe.thoregon;
};

export const myterra = () => {
    const universe = universe;
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

/**
 * await a timeout
 * @param ms
 * @returns {Promise<unknown>}
 */
export const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * just let the event loop work
 * @returns {Promise<*>}
 */
export const doAsync = () => timeout(0);

/**
 * wrap a non blocking function with a promise
 * use to handle callbacks as async functions
 * catches all exceptions and handles it (with reject)
 */

export const asynccallback = (fn) => new Promise(async (resolve, reject) => { try { fn(resolve,reject) } catch (e) { reject(e) } });

export const rnd = (l) => {
    return btoa( String.fromCharCode( ...crypto.getRandomValues(new Uint8Array(l ?? 32)) ) ).replaceAll(/[\/|+|=]/g,'').substring(0, l ?? 32);
}

export const rndOld = (l, c) => {
    var s = '';
    l = l || 32; // you are not going to make a 0 length random number, so no need to check type
    c = c || '0123456789ABCDEFGHIJKLMNOPQRSTUVWXZabcdefghijklmnopqrstuvwxyz';
    var r = crypto.getRandomValues(new Uint32Array(Math.floor(l/4)));
    // better random strings.
    // ! yes, the operator % reduces randomness!
    // Build long enought strings > 16 characters
    while (l > 0) { s += c.charAt((r[Math.ceil(l/4)-1] >> (l%4) & 255) % c.length); l-- }
    return s;
}


export const halt = () => { if (universe.HALT) debugger };
