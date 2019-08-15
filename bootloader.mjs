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

// *** make 'window' global available. support 'browser' and 'node' modules to use 'global' or 'window' arbitrarily
// *** yes, this is not true, but since javascript modules automatically runs in strict mode, there is no way to test for 'global' or 'window' without an error
global.window = global;
// *** some test methods
Object.defineProperties(global, {
    'isBrowser' :   { value: false, configurable: false, enumerable: true, writable: false},
    'isReliant' :   { value: false, configurable: false, enumerable: true, writable: false},
    'isNode' :      { value: true,  configurable: false, enumerable: true, writable: false},
    'isSovereign' : { value: true,  configurable: false, enumerable: true, writable: false},
});

// some constants to check what to resolve
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

    if (builtins.includes(basename)) {
        return {
            url: specifier,
            format: 'builtin'
        };
    }

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
        let parent = typeof parentModuleURL == 'string'
            ? parentModuleURL.startsWith('file:')
                ? parentModuleURL.substr(5)
                : parentModuleURL
            : parentModuleURL.pathname;
        let modulepath = findModulePath(basename, parent);
        if (modulepath) {
            let mainpath = findMain(modulepath);
            if (mainpath) {
                return {
                    url: 'file://' + mainpath.path,
                    format: mainpath.format
                };
            }
        }
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

function findModulePath(name, parent) {
    let search = path.join(parent, 'node_modules/');
    if (fs.existsSync(search)) {
        let modulepath = path.join(search, name);
        return fs.existsSync(modulepath)
            ? modulepath
            : null;
    } else {
        return parent !== '/'
            ? findModulePath(name, path.join(parent, '..'))
            : null;
    }
}

function findMain(modulepath) {
    let packagepath = path.join(modulepath, "package.json");
    if (!fs.existsSync(packagepath)) return null;
    let packagedefinition = JSON.parse(new String(fs.readFileSync(packagepath)));
    // todo: if not "jsnext:main" then check if "type" is "module", otherwise it must be packaged
/*
    let mainpath = { path: path.join(modulepath, (packagedefinition["jsnext:main"]) ? packagedefinition["jsnext:main"] : (packagedefinition.main) ? packagedefinition.main : 'index.js') };
    mainpath.format = (packagedefinition["jsnext:main"] || packagedefinition["type"] === 'module') ? 'module' : 'commonjs';
*/
    let mainpath = { path: path.join(modulepath, (packagedefinition.main) ? packagedefinition.main : 'index.js') };
    mainpath.format = (packagedefinition["type"] === 'module') ? 'module' : 'commonjs';
    return mainpath;
}

function isNodeModule(basename) {
    return fs.existsSync(path.join(process.cwd(), 'node_modules/', basename));
}
