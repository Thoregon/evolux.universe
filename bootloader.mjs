/**
 *
 *
 * @author: blukassen
 */

import fs from 'fs';
import path from 'path';
import process from 'process';
import Module from 'module';
import universetemplate from './preloader.mjs';

const builtins = Module.builtinModules;
const JS_EXTENSIONS = new Set(['.js', '.mjs']);

const baseURL = new URL(`${process.cwd()}/`, 'file://');

export function resolve(specifier, parentModuleURL = baseURL, defaultResolve) {
    //console.log(`loader.resolve('${specifier}')`);
    if (builtins.includes(specifier)) {
        return {
            url: specifier,
            format: 'builtin'
        };
    }
    if (/^\.{0,2}[/]/.test(specifier) !== true && !specifier.startsWith('file:')) {
        // For node_modules support:
        // return defaultResolve(specifier, parentModuleURL);
        throw new Error(
            `imports must begin with '/', './', or '../'; '${specifier}' does not`);
    }
    const resolved = new URL(specifier, parentModuleURL);
    const basename = path.basename(resolved.pathname);
    const ext = path.extname(resolved.pathname);
/*
    if (basename.startsWith('universe.') && JS_EXTENSIONS.has(ext)) {
        return {
            url: resolved.href,
            format: 'dynamic'
        };
    }
*/
    if (!JS_EXTENSIONS.has(ext)) {
        throw new Error(
            `Cannot load file with non-JavaScript file extension ${ext}.`);
    }
    return {
        url: resolved.href,
        format: 'module'
    };
}

/*
export async function dynamicInstantiate(url) {
    console.log(`loader.dynamicInstantiate('${url}')`);
    let src = fs.readFileSync(url.replace('file://', ''));
    let m = srcload(src.toString(), url);
    return {
        exports: Object.getOwnPropertyNames(m),
        execute: (exports) => {
            Object.assign(exports, m);
            // Get and set functions provided for pre-allocated export names
            // exports.dyntest.set('Dytest');
        }
    };
}

export function srcload(code, filename, opts) {
    if (typeof filename === 'object') {
        opts = filename;
        filename = undefined;
    }

    opts = opts || {};
    filename = filename || '';

    opts.appendPaths = opts.appendPaths || [];
    opts.prependPaths = opts.prependPaths || [];

    if (typeof code !== 'string') {
        throw new Error('code must be a string, not ' + typeof code);
    }

    var paths = Module._nodeModulePaths(path.dirname(filename));

    var parent = null; // module.parent;
    var m = new Module(filename, parent);
    m.filename = filename;
    m.paths = [].concat(opts.prependPaths).concat(paths).concat(opts.appendPaths);
    m._compile(code, filename);

    var exports = m.exports;
    parent && parent.children && parent.children.splice(parent.children.indexOf(m), 1);

    return m;
};*/
