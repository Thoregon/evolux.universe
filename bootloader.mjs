/**
 * Use the loader to start 'node'.
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

const thoregon = {};
// *** some test methods
Object.defineProperties(thoregon, {
    'ui'              : { value: false, configurable: false, enumerable: true, writable: false },
    'isBrowser'       : { value: false, configurable: false, enumerable: true, writable: false },
    'isReliant'       : { value: false, configurable: false, enumerable: true, writable: false },
    'isNode'          : { value: true, configurable: false, enumerable: true, writable: false },
    'isSovereign'     : { value: true, configurable: false, enumerable: true, writable: false },
    'bootloader'      : { value: bootloader, configurable: false, enumerable: true, writable: false },
    'nature'          : { value: 'sovereign', configurable: false, enumerable: true, writable: false },
    'density'         : { value: 'headless', configurable: false, enumerable: true, writable: false }, // todo: add 'headed' for Electron and mobile apps
    'isThoregonModule': { value: (specifier) => bootloader.isThoregonModule(specifier), configurable: false, enumerable: true, writable: false },
    'addLoader'       : { value: (name, loader, sig) => bootloader.addLoader(name, loader, sig), configurable: false, enumerable: true, writable: false },
});

/*
 * define some globals
 */
const properties = {};

if (!global.thoregon)   properties.thoregon   = { value: thoregon,  configurable: false, enumerable: true, writable: false };
if (!global.globalThis) properties.globalThis = { value: global,    configurable: false, enumerable: true, writable: false };
if (!global.crypto)     properties.crypto     = { value: { ...crypto.webcrypto.subtle, getRandomValues: crypto.webcrypto.getRandomValues },    configurable: false, enumerable: true, writable: false };

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
