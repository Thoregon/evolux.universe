/**
 * Use the loader to start 'node'.
 *
 *
 * todo: rename to 'protouniverse.mjs'
 *
 * Located here to for easier reference, should be located at ./lib/souvereign/
 *
 * @author: blukassen
 */

import Bootloader       from "./lib/loader/bootloader.mjs";
import process          from "process";
import crypto           from "crypto";
import fs               from "fs";
import dotenv           from "dotenv";
dotenv.config();

const baseURL           = new URL(`${process.cwd()}/`, 'file://');
const bootloader        = new Bootloader();

// check for the 'dev' switch now because this setting is immutable
const isDev = process.argv.includes("-d");

//
// source
//

async function resolveLocation(specifier/*, parentURL*/) {
    const nextResolve = (specifier, context) => {
        const url      = context.parentURL ? new URL(specifier, context.parentURL) : new URL(specifier, 'file:/'+process.cwd()+'/thoregon.mjs');
        return {
            url,
            shortCircuit: true  // NodeJS 18.x
        }
    }

    const nextLoad = (specifier, context) => {
        try {
            const fpath = specifier.substring(6);
            const source = (fs.readFileSync(fpath)).toString('utf8');
            return {
                source,
                shortCircuit: true  // NodeJS 18.x
            };
        } catch (ignore) {}
    }

    try {
        if (!specifier) return;

        if (specifier.startsWith('file:')) {
            const loaded = nextLoad(specifier);
            const source = loaded?.source;
            return source;
        }

        const procContext = { parentURL: /*parentURL ??*/ 'file:/'+process.cwd()+'/thoregon.mjs' };

        const resolved = await bootloader.resolve(specifier, procContext, nextResolve);
        const url = resolved?.url;

        return typeof url === 'string' ? url : undefined;
/*
        if (!url) return;

        const loaded = await bootloader.load(url, procContext, nextLoad);
        const source = loaded?.source;
        return source;
*/
    } catch (ignore) {
        console.log("source error", ignore);
    }
}

async function content(specifier) {
    const url = await resolveLocation(specifier);
    if (!url) return;
    const filename = url.substring(7);
    const content = fs.readFileSync(filename);
    return content;
}

async function source(specifier/*, parentURL*/) {
    specifier = decodeURIComponent(specifier);
    const nextResolve = (specifier, context) => {
        const url      = context.parentURL ? new URL(specifier, context.parentURL) : new URL(specifier, 'file:/'+process.cwd()+'/thoregon.mjs');
        return {
            url,
            shortCircuit: true  // NodeJS 18.x
        }
    }

    const nextLoad = (specifier, context) => {
        try {
            const i = specifier.indexOf('/C:');
            const fpath = i > -1 ?  specifier.substring(i+1) : specifier.substring(6);
            const source = (fs.readFileSync(fpath)).toString('utf8');
            return {
                source,
                shortCircuit: true  // NodeJS 18.x
            };
        } catch (ignore) {
            console.log(ignore);
            debugger;
        }
    }

    try {
        if (!specifier) return;

        if (specifier.startsWith('file:')) {
            const loaded = nextLoad(specifier);
            const source = loaded?.source;
            return source;
        }

        const parenturl = ('file:/'+process.cwd()+'/thoregon.mjs').replaceAll('\\', '/');
        const procContext = { parentURL: /*parentURL ??*/ 'file:/'+process.cwd()+'/thoregon.mjs' };

        const resolved = await bootloader.resolve(specifier, procContext, nextResolve);
        const url = resolved?.url;
        if (!url) return;

        const loaded = await bootloader.load(url, procContext, nextLoad);
        const source = loaded?.source;
        return source;
    } catch (ignore) {
        console.log("source error", ignore);
    }
}

//-------------------------------------------------------------

const thoregon = {};
// *** some test methods
Object.defineProperties(thoregon, {
    'ui'               : { value: false, configurable: false, enumerable: true, writable: false },
    'isBrowser'        : { value: false, configurable: false, enumerable: true, writable: false },
    'isReliant'        : { value: false, configurable: false, enumerable: true, writable: false },
    'isNode'           : { value: true, configurable: false, enumerable: true, writable: false },
    'isSovereign'      : { value: true, configurable: false, enumerable: true, writable: false },
    'bootloader'       : { value: bootloader, configurable: false, enumerable: true, writable: false },
    'nature'           : { value: 'sovereign', configurable: false, enumerable: true, writable: false },
    'density'          : { value: 'headless', configurable: false, enumerable: true, writable: false }, // todo: add 'headed' for Electron and mobile apps
    'addLoader'        : { value: (name, loader, sig) => bootloader.addLoader(name, loader, sig), configurable: false, enumerable: false, writable: false },
    'birth'            : { value: Date.now(), configurable: false, enumerable: true, writable: false },
    'since'            : { get: () => Date.now() - thoregon.birth, configurable: false, enumerable: true },
    'checkpoint'       : { value: (msg) => console.log(msg, Date.now() - thoregon.birth), configurable: false, enumerable: true, writable: false },
    'isDev'            : { value: isDev, configurable: false, enumerable: true, writable: false },
    'debug'            : { value: false, configurable: false, enumerable: true, writable: false },
    'activateFirewalls': { value: async () => {} /*await protouniverse?.activateFirewalls()*/, configurable: false, enumerable : true, writable: false },
    'loader'           : { value: bootloader, configurable: false, enumerable: true, writable: false },
    'source'           : { value: source, configurable: false, enumerable: false, writable: false },
    'content'          : { value: content, configurable: false, enumerable: false, writable: false },
    'location'         : { value: resolveLocation, configurable: false, enumerable: false, writable: false },
});

/*
 * define some globals
 */
const properties = {};

if (!global.thoregon)   properties.thoregon   = { value: thoregon,  configurable: false, enumerable: true, writable: false };
if (!global.globalThis) properties.globalThis = { value: global,    configurable: false, enumerable: true, writable: false };
if (!global.crypto)     properties.crypto     = { value: { subtle: crypto.webcrypto.subtle, getRandomValues: crypto.webcrypto.getRandomValues.bind(crypto.webcrypto), CryptoKey: crypto.webcrypto.KeyObject }, configurable: false, enumerable: true, writable: false };
if (!global.CryptoKey)  properties.CryptoKey  = { value: crypto.webcrypto.CryptoKey, configurable: false, enumerable: true, writable: false };

if(typeof btoa === "undefined"){
    global.btoa = (data) => Buffer.from(data, "binary").toString("base64");
    global.atob = (data) => Buffer.from(data, "base64").toString("binary");
}

Object.defineProperties(global, properties);


//
// Polyfill essential behavior
// todo [REFACTOR]: extract to vanillaT
//

if (!Object.prototype.hasOwnProperty('$thoregonEntity')) Object.defineProperty(Object.prototype, '$thoregonEntity', { configurable: false, enumerable: false, writable: false, value: undefined });
// if (!Function.prototype.metaClass) Object.defineProperty(Function.prototype, 'metaClass', { configurable: false, enumerable: false, writable: false, value: function ({ url } = {}, metaClass) { return this._metaclass } });
if (!Function.prototype.hasOwnProperty('checkIn')) Object.defineProperty(Function.prototype, 'checkIn', { configurable: false, enumerable: false, writable: false, value: function ({ url } = {}, metaClass) { globalThis.dorifer?.checkinClass(url, this, metaClass) } });

//
// redirect loader functions
//

export async function resolve(specifier, context, defaultResolve) {
    return await bootloader.resolve(specifier, context, defaultResolve);
}

export async function getFormat(href, context, defaultGetFormat) {
    return await bootloader.getFormat(href, context, defaultGetFormat)
}

export async function getSource(url, context, defaultGetSource) {
    return await bootloader.getSource(url, context, defaultGetSource);
}

export async function transformSource(source, context, defaultTransformSource) {
    return await bootloader.transformSource(source, context, defaultTransformSource)
}
