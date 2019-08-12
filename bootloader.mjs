/**
 * Use the loader to start 'node'.
 *
 * Located here to for easier reference, should be located at ./lib/souvereign/
 *
 * @author: blukassen
 */

import fs               from 'fs';
import path             from 'path';
import process          from 'process';
import Module           from 'module';

const builtins          = Module.builtinModules;
const JS_EXTENSIONS     = new Set(['.js', '.mjs']);
const THOREGON_PREFIXES = ['/tr/', '/T/', 't͛', '/T͛/'];

const baseURL           = new URL(`${process.cwd()}/`, 'file://');

// to ensure the same codebase, references like '/evolux.universe' must be correctly resolved

export async function resolve(specifier, parentModuleURL = baseURL, defaultResolve) {

    // todo: resolve a root refernce '/' to builtin's and node_modules

    console.log(`loader : $$ resolve('${specifier}')`);

    // if (specifier.startsWith('/')) specifier.substr(1);

    if (builtins.includes(specifier)) {
        return {
            url: specifier,
            format: 'builtin'
        };
    }

    if (/^\.{0,2}[/]/.test(specifier) !== true && !specifier.startsWith('file:')) {
        // For node_modules support:
        return defaultResolve(specifier, parentModuleURL);
/*
        throw new Error(
            `imports must begin with '/', './', or '../'; '${specifier}' does not`);
*/
    }
    const resolved = new URL(specifier, parentModuleURL);
    const basename = path.basename(resolved.pathname);
    const ext = path.extname(resolved.pathname);

    // todo: replace with 'node_modules' lookup
    if (basename === 'evolux.universe') {
        return {
            url: 'file:///Entw/Projects/ThoregonUniverse/evolux.modules/evolux.universe/index.mjs',
            format: 'module'
        };
    }

    if (specifier.startsWith('/') && isNodeModule(basename)) {
        return defaultResolve(basename, parentModuleURL);
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
    console.log(`loader : $$ dynamicInstantiate('${url}')`);
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

function isNodeModule(basename) {
    return fs.existsSync(path.join(process.cwd(), 'node_modules/', basename));
}
