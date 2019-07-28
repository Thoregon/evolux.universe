/**
 *
 *
 * @author: blukassen
 */

import fs from 'fs';
import path from 'path';
import process from 'process';
import Module from 'module';
// import universetemplate from './preloader.mjs';

const builtins = Module.builtinModules;
const JS_EXTENSIONS = new Set(['.js', '.mjs']);

const baseURL = new URL(`${process.cwd()}/`, 'file://');

// to ensure the same codebase, references like '/evolux.universe' must be correctly resolved

export async function resolve(specifier, parentModuleURL = baseURL, defaultResolve) {
    console.log(`$$ loader.resolve('${specifier}')`);
    if (builtins.includes(specifier)) {
        return {
            url: specifier,
            format: 'builtin'
        };
    }
/*

    if (specifier === './testmodule.mjs') {
        console.log(`$$ resolve dynamic ${specifier}`);
        return {
            url: new URL(specifier, parentModuleURL).href,
            format: 'dynamic'
        };
    }
*/

    if (/^\.{0,2}[/]/.test(specifier) !== true && !specifier.startsWith('file:')) {
        // For node_modules support:
        return defaultResolve(specifier, parentModuleURL);
/*  this is the specified WHATWG behavior
        throw new Error(
            `imports must begin with '/', './', or '../'; '${specifier}' does not`);
*/
    }
    const resolved = new URL(specifier, parentModuleURL);
    const basename = path.basename(resolved.pathname);
    const ext = path.extname(resolved.pathname);

    if (basename === 'evolux.universe') {
        return {
            url: 'file:///Entw/Projects/ThoregonUniverse/evolux.modules/evolux.universe/index.mjs',
            format: 'module'
        };
    }

    if (!JS_EXTENSIONS.has(ext)) {
        throw new Error(
            `Cannot load file with non-JavaScript file extension ${ext}.`);
    }
    return {
        url: resolved.href,
        format: 'module'
    };
}

export async function dynamicInstantiate(url) {
    console.log(`$$ loader.dynamicInstantiate('${url}')`);
    let module = await import(url);
    console.log(`$$ imported ('${url}')`);
    let properties = [];
    let mexports = {};
    for (let property in module) {
        properties.push(property);
        mexports[property] = module[property];
    }
    return {
        exports: properties,
        execute: (exports) =>  Object.assign(exports, mexports)
    };
}
