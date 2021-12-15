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
import crypto           from 'crypto';

const baseURL           = new URL(`${process.cwd()}/`, 'file://');
const bootloader        = new Bootloader();

// check for the 'dev' switch now because this setting is immutable
const isDev = process.argv.includes("-d");

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
    'addLoader'        : { value       : (name, loader, sig) => bootloader.addLoader(name, loader, sig), configurable: false, enumerable: true, writable: false },
    'birth'            : { value: Date.now(), configurable: false, enumerable: true, writable: false },
    'since'            : { get: () => Date.now() - thoregon.birth, configurable: false, enumerable: true },
    'checkpoint'       : { value: (msg) => console.log(msg, Date.now() - thoregon.birth), configurable: false, enumerable: true, writable: false },
    'isDev'            : { value: isDev, configurable: false, enumerable: true, writable: false },
    'debug'            : { value: false, configurable: false, enumerable: true, writable: false },
    'activateFirewalls': { value: async () => {} /*await protouniverse?.activateFirewalls()*/, configurable: false, enumerable : true, writable: false },
    'loader'           : { value: bootloader, configurable: false, enumerable: true, writable: false },
});

/*
 * define some globals
 */
const properties = {};

if (!global.thoregon)   properties.thoregon   = { value: thoregon,  configurable: false, enumerable: true, writable: false };
if (!global.globalThis) properties.globalThis = { value: global,    configurable: false, enumerable: true, writable: false };
if (!global.crypto)     properties.crypto     = { value: { subtle: crypto.webcrypto.subtle, getRandomValues: crypto.webcrypto.getRandomValues, CryptoKey: crypto.webcrypto.KeyObject }, configurable: false, enumerable: true, writable: false };
if (!global.CryptoKey)  properties.CryptoKey  = { value: crypto.webcrypto.CryptoKey, configurable: false, enumerable: true, writable: false };

if(typeof btoa === "undefined"){
    global.btoa = (data) => Buffer.from(data, "binary").toString("base64");
    global.atob = (data) => Buffer.from(data, "base64").toString("binary");
}

Object.defineProperties(global, properties);

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
