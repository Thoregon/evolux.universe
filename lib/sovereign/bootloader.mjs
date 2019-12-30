import path             from "path";
import fs               from "fs";
import process          from "process";
import Module           from 'module';
import ThoregonLoader   from "../thoregonloader.mjs";

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

/**
 * Bootloader for sovereign nodes
 *
 * @author: blukassen
 */
// some constants to check what to resolve
const builtins          = Module.builtinModules;
const JS_EXTENSIONS     = new Set(['.js', '.mjs']);
const thoregonloader    = new ThoregonLoader({ root: './', cachelocation: './.thoregon/jscache'});

export default class Bootloader {

    constructor() {
        thoregonloader.ensureCache();
    }

    async resolve(specifier, parentModuleURL = baseURL, defaultResolve) {
        logger.debug(`loader : $$ resolve('${specifier}')`);

        if (this.isBuiltin(specifier)) return this.resolveBuiltin(specifier);
        if (this.isStdNodeModule(specifier)) return this.resolveStdNodeModule(specifier, parentModuleURL, defaultResolve);
        if (this.isUniverse(specifier)) return this.resolveUniverse(specifier);

        const resolved = new URL(specifier, parentModuleURL);

        if (this.isThoregonModule(specifier)) return thoregonloader.resolveThoregon(specifier, resolved);

        const basename = path.basename(resolved.pathname);
        const ext = path.extname(resolved.pathname);

        if (this.isNodeModule(specifier, basename)) return this.resolveNodeModule(basename, parentModuleURL, defaultResolve);
        if (this.isModule(specifier, basename)) return this.resolveModule(specifier, parentModuleURL, defaultResolve);

        if (!JS_EXTENSIONS.has(ext)) {
            let m = this.resolveSubNodeModule(basename, parentModuleURL);
            if (!!m) return m;
        }

        if (!JS_EXTENSIONS.has(ext)) {
            logger.error(`Cannot load file with non-JavaScript file extension ${ext}.\nFrom: ${parentModuleURL}\nImport: ${specifier}`);
            throw new Error(`Cannot load file with non-JavaScript file extension ${ext}.`);
        }

        // after checking all 'special' names, at least load the required ES6 module
        return {
            url: resolved.href,
            // todo: in future support only 'module'
            format: ext === 'js' ? 'commonjs' : 'module'
        };
    }

    async dynamicInstantiate(url) {
        logger.debug(`$$ dynamicInstantiate('${url}')`);
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
            execute: ((_exports) => { return (exports) => {
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
        return builtins.includes(specifier);
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

    resolveModule(specifier, parentModuleURL, defaultResolve) {
        let ref = this._findMain(specifier);
        return {
            url: 'file://' + ref.path,
            format: ref.format
        }
    }

    resolveStdNodeModule(specifier, parentModuleURL, defaultResolve) {
        /* todo: in future reject modules which does not fulfill the path requirements
        throw new Error(`imports must begin with '/', './', or '../'; '${specifier}' does not`);
        */
        return defaultResolve(specifier, parentModuleURL);
    }

    isNodeModule(specifier, basename) {
        return specifier.startsWith('/') && this._isNodeModule(basename);
    }

    isModule(specifier, basname) {
        return specifier.startsWith('/') && fs.existsSync(specifier) && fs.lstatSync(specifier).isDirectory();
    }

    resolveNodeModule(basename, parentModuleURL, defaultResolve) {
        let parent = 'file:///' + path.join(process.cwd(), 'node_modules/');
        return defaultResolve(basename, parent);
    }

    resolveSubNodeModule(basename, parentModuleURL) {
        let parent = typeof parentModuleURL == 'string'
            ? parentModuleURL.startsWith('file:')
                ? parentModuleURL.substr(5)
                : parentModuleURL
            : parentModuleURL.pathname;
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
