import path             from "path";
import fs               from "fs";
import process          from "process";
import Module           from 'module';
import ThoregonLoader   from "../thoregonloader.mjs";

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
        console.log(`loader : $$ resolve('${specifier}')`);

        if (this.isBuiltin(specifier)) return this.resolveBuiltin(specifier);
        if (this.isStdNodeModule(specifier)) return this.resolveStdNodeModule(specifier, parentModuleURL, defaultResolve);

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
