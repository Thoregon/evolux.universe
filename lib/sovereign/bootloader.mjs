import path             from "path";
import fs               from "fs";
import process          from "process";
import Module           from 'module';
import ThoregonLoader   from "../thoregonloader.mjs";
import nodels           from "node-localstorage";
import ModuleResolver   from "../modules/moduleresolver.mjs";

const forEach = async (collection, fn) => {
    for (let index = 0; index < collection.length; index++) {
        await fn(collection[index], index, collection);
    }
};

/**
 * reliable logging event without a defined universe
 */

const isDebug = () => global.universe && global.universe.DEBUG || false;

const emsg = (err) => !!err ? err.trace ? `\n${err.trace()}` : err.stack ? `\n${err.stack}` : err.message ? ` --> ${err.message}` : err.toString() : '';

const logger = {
    _log(level, ...message) {
        console.log(level, ':', ...message);
    },

    log(level, ...message) {
        if (global.universe && global.universe.logger) {
            global.universe.logger.log(level, ...message);
        } else {
            this._log(level, ...message);
        }
    },

    info(...message) {
        this.log('info', ...message);
    },

    warn(...message) {
        this.log('warn', ...message);
    },

    error(note, err, ...message) {
        let str = (err) ? `${note}: ${emsg(err)}`: note;
        this.log('error', str, ...message);
    },

    debug(...message) {
        if (isDebug()) this.log('debug',... message);
    }
};

const ensureDir = (dir) => {
    const sep = path.sep;
    // todo: make each sub dir! otherwise may throw an error
    if (!fs.existsSync(dir)) {
        let dirpath = dir.startsWith(`.${sep}`) ? dir.substr(sep.length+1) : dir;
        let parts = dirpath.split('/');
        let createpath = process.cwd();
        while (parts.length > 0) {
            let part = parts.splice(0,1);
            if (part.length === 0 || part[0] === '') continue;
            let elem = part[0];
            createpath += '/' +elem;
            if (!fs.existsSync(createpath)) fs.mkdirSync(createpath);
        }
    }
};

const cachepath         = './.thoregon/jscache';
const localstorepath    = './.thoregon/localStore';

ensureDir(cachepath);
ensureDir(localstorepath);

/**
 * Bootloader for sovereign nodes
 *
 * @author: blukassen
 */
// some constants to check what to resolve
const builtins          = Module.builtinModules;
// '.tcd'   ... Thoregon Component Descriptor
// '.tvs'   ... Thoregon Vault Store
const JS_EXTENSIONS     = new Set(['.js', '.mjs', '.json', '.sh', '.tcd', '.tvs']);    // todo: enable extensions with bootloader plugin
const thoregonloader    = new ThoregonLoader({ root: './', cachelocation: cachepath});

// polyfill localStoreage
if (!global.localStorage)   Object.defineProperty(global, "localStorage", { value: new nodels.LocalStorage(localstorepath),  configurable: false, enumerable: true, writable: false });

export default class Bootloader {

    constructor() {
        thoregonloader.ensureCache();
    }

    async resolve(specifier, context, defaultResolve) {
        let { conditions, parentURL } = context;
        logger.debug(`loader : $$ resolve('${specifier}') from: '${parentURL}'`);

        if (this.isBuiltin(specifier)) return this.resolveBuiltin(specifier);
        if (this.isStdNodeModule(specifier)) return this.resolveStdNodeModule(specifier, parentURL, defaultResolve);
        if (this.isUniverse(specifier)) return this.resolveUniverse(specifier);

        const resolved = new URL(specifier, parentURL);

        if (specifier === './@components') return this.resolveComponents(specifier,parentURL);
        if (specifier.indexOf('/@components') > -1) return this.resolveComponents(specifier, specifier);
        if (this.isThoregonModule(specifier)) return thoregonloader.resolveThoregon(specifier, resolved);

        const basename = specifier.startsWith('/@') ? specifier : path.basename(resolved.pathname);
        const ext = path.extname(resolved.pathname);

        if (this.isNodeModule(specifier, basename)) return this.resolveNodeModule(basename, parentURL, defaultResolve);
        // if (this.isNodeModuleFile(specifier, basename)) return this.resolveNodeModuleFile(specifier, parentURL, defaultResolve);
        if (this.isModule(specifier, basename)) return this.resolveModule(specifier, parentURL, defaultResolve);

        if (!JS_EXTENSIONS.has(ext)) {
            let m = this.resolveSubNodeModule(basename, parentURL);
            if (!!m) return m;
        }

        if (!JS_EXTENSIONS.has(ext)) {
            logger.error(`Cannot load file with non-JavaScript file extension ${ext}.\nFrom: ${parentURL}\nImport: ${specifier}`);
            throw new Error(`Cannot load file with non-JavaScript file extension ${ext}.`);
        }

        // after checking all 'special' names, at least load the required ES6 module
        return {
            url: resolved.href,
        };
    }

    async getFormat(url, context, defaultGetFormat) {
        let { conditions, parentURL } = context;
        const resolved = new URL(url, parentURL);
        const ext = path.extname(resolved.pathname);
        return {
            format: ext === '.json' ? 'json' : ext === '.js' ? 'commonjs' : 'module'
        };
        // return defaultGetFormat(url, context, defaultGetFormat);
    }

    async getSource(url, context, defaultGetSource) {
        // return {
        //     source: '...',
        // };
        return defaultGetSource(url, context, defaultGetSource);
    }

    async dynamicInstantiate(url) {
        logger.debug(`$$ dynamicInstantiate('${url}')`);
        try {
            if (url.startsWith('components:/')) {
                return await this.dynamicComponents(url);
            } else {
                return await this.dynamicUniverse(url);
            }
        } catch (e) {
            logger.error(`can't resolve import ->`, url);
            return {
                exports: [],
                execute: () => {}
            }
        }
    }

    // todo: introduce loader plugins and move to dyncomponents
    async dynamicComponents(baseurl) {
        baseurl = baseurl.substr(('components:/'.length));
        let root = path.join(baseurl, '..');
        if (root.startsWith('file:')) root = root.substr('file:'.length);
        let url = path.join(root, 'components');
        let components = await ModuleResolver.analyseComponents(url, root,{ nature: thoregon.nature, density: thoregon.density});

        return {
            exports: ['default'],
            execute: ((_components) => {
                return async (exports) => {
/*  This is done by the component loader
                    await forEach(Object.keys(components), async name => {
                        let component = components[name];
                        component.module = await import(path.join(root, component.href));
                    });
*/
                    exports['default'].set(components);
                }
            })(components)
        };
    }

    async dynamicUniverse(url) {
        url = url.substr('thoregon:/'.length);
        let parts = url.split('/');
        let mexports = global;
        for (let part of parts) {
            mexports = mexports[part];
        }
        let names = Object.keys(mexports);
        names.push('default');
        return {
            exports: names,
            execute: ((_exports) => {
                return (exports) => {
                    for (let item of Object.keys(exports)) {
                        exports[item].set((item === 'default') ? _exports : _exports[item]);
                    }
                }
            })(mexports)
        };
    }

// **** select and resolve different kinds of modules
    isBuiltin(specifier) {
        if (specifier.startsWith('/')) specifier = specifier.substr(1);
        return builtins.includes(specifier);   // !!builtins.find(builtin => specifier.startsWith(builtin));
    }

    resolveBuiltin(specifier) {
        if (specifier.startsWith('/')) specifier = specifier.substr(1);
        return {
            url: specifier,
            format: 'builtin'
        };
    }

    isUniverse(specifier) {
        return specifier.startsWith('/universe');
    }

    resolveComponents(specifier, baseUrl) {
        if (specifier.startsWith('/')) specifier = specifier.substring(1);
        if (specifier.endsWith('/')) specifier = url.substring(0, specifier.length-2);
        return {
            url: `components:/${baseUrl}`,
            format: 'dynamic'
        };
    }

    resolveUniverse(specifier) {
        if (specifier.startsWith('/')) specifier = specifier.substring(1);
        if (specifier.endsWith('/')) specifier = url.substring(0, specifier.length-2);
        return {
            url: `thoregon:/${specifier}`,
            format: 'dynamic'
        };
    }

    isStdNodeModule(specifier) {
        return /^\.{0,2}[/]/.test(specifier) !== true && !specifier.startsWith('file:');
    }

    resolveModule(specifier, parentURL, defaultResolve) {
        let ref = this._findMain(specifier);
        return {
            url: 'file://' + ref.path,
            format: ref.format
        }
    }

    resolveStdNodeModule(specifier, parentURL, defaultResolve) {
        /* todo: in future reject modules which does not fulfill the path requirements
        throw new Error(`imports must begin with '/', './', or '../'; '${specifier}' does not`);
        */
        return defaultResolve(specifier, parentURL);
    }

    isNodeModule(specifier, basename) {
        return specifier.startsWith('/') && this._isNodeModule(basename);
    }

/*
    isNodeModuleFile(specifier, basename) {
        const parts = specifier.split('/');
        const ext = path.extname(specifier);
        return specifier.startsWith('/') && this._isNodeModule(parts[1]) && fs.existsSync(path.join(process.cwd(), 'node_modules/', specifier)) && JS_EXTENSIONS.has(ext);
    }
*/

    isModule(specifier, basname) {
        return specifier.startsWith('/') && fs.existsSync(specifier) && fs.statSync(specifier).isDirectory();
    }

    resolveNodeModule(basename, parentURL, defaultResolve) {
        let parent = 'file:///' + path.join(process.cwd(), 'node_modules/');
        return defaultResolve(basename, parent);
    }

/*
    resolveNodeModuleFile(specifier, parentURL, defaultResolve) {
        let module = 'file:///' + path.join(process.cwd(), 'node_modules/', specifier);
        const ext = path.extname(specifier);
        return {
            url: module,
            // todo: in future support only 'module'
            format: ext === 'js' ? 'commonjs' : 'module'
        };
    }
*/

    resolveSubNodeModule(basename, parentURL) {
        let parent = typeof parentURL == 'string'
            ? parentURL.startsWith('file:')
                ? parentURL.substr(5)
                : parentURL
            : parentURL.pathname;
        let modulepath = this._findModulePath(basename, parent);
        if (modulepath) {
            let mainpath = this._findMain(modulepath);
            if (mainpath) {
                return {
                    url: 'file://' + mainpath.path,
                    format: mainpath.format
                };
            }
        }
    }

    isThoregonModule(specifier) {
        return thoregonloader.isThoregon(specifier);
    }
    // **** private
    _findModulePath(name, parent) {
        let search = path.join(parent, 'node_modules/');
        if (fs.existsSync(search)) {
            let modulepath = path.join(search, name);
            return fs.existsSync(modulepath)
                ? modulepath
                : null;
        } else {
            return parent !== '/'
                ? this._findModulePath(name, path.join(parent, '..'))
                : null;
        }
    }

    _findMain(modulepath) {
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

    _isNodeModule(basename) {
        return fs.existsSync(path.join(process.cwd(), 'node_modules/', basename));
    }

}
