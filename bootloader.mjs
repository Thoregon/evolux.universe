/**
 * Use the loader to start 'node'.
 *
 * Located here to for easier reference, should be located at ./lib/souvereign/
 *
 * @author: blukassen
 */

import Bootloader       from "./lib/sovereign/bootloader.mjs";
import process          from "process";

const baseURL           = new URL(`${process.cwd()}/`, 'file://');
const bootloader        = new Bootloader();

// *** make 'window' global available. support 'browser' and 'node' modules to use 'global' or 'window' arbitrarily
// *** yes, this is not true, but since javascript modules automatically runs in strict mode, there is no way to test for 'global' or 'window' without an error
// global.window = global;
const thoregon = {};
// *** some test methods
Object.defineProperties(thoregon, {
    'isBrowser':        { value: false, configurable: false, enumerable: true, writable: false},
    'isReliant':        { value: false, configurable: false, enumerable: true, writable: false},
    'isNode':           { value: true,  configurable: false, enumerable: true, writable: false},
    'isSovereign':      { value: true,  configurable: false, enumerable: true, writable: false},
    'bootloader':       { value: bootloader,  configurable: false, enumerable: true, writable: false},
    'nature':           { value: 'sovereign', configurable: false, enumerable: true, writable: false },
    'density':          { value: 'headless',  configurable: false, enumerable: true, writable: false }, // todo: add 'headed' for Electron and mobile apps
    'isThoregonModule': { value: (specifier) => bootloader.isThoregonModule(specifier), configurable: false, enumerable: true, writable: false}
});

Object.defineProperties(global, {
    'thoregon':     { value: thoregon, configurable: false, enumerable: true, writable: false },
});

export async function resolve(specifier, parentModuleURL = baseURL, defaultResolve) {
    return bootloader.resolve(specifier, parentModuleURL, defaultResolve);
}

export async function dynamicInstantiate(url) {
    return bootloader.dynamicInstantiate(url);
}
