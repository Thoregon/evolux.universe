import path    from "path";
import fs      from "fs";
import process from "process";
import Module  from 'module';
import nodels  from "node-localstorage";
import t͛      from './thoregonmapping.mjs';
import c       from './componentmapping.mjs';

const cachepath         = './.thoregon/jscache';
const localstorepath    = './.thoregon/localStore';

// some constants to check what to resolve
const builtins          = Module.builtinModules;

// '.tcd'   ... Thoregon Component Descriptor
// '.tvs'   ... Thoregon Vault Store
// const JS_EXTENSIONS     = new Set(['.js', '.mjs', '.json', '.sh', '.tcd', '.tvs']);    // todo: enable extensions with bootloader plugin
// const thoregonloader    = new ThoregonLoader({ root: './', cachelocation: cachepath});

// polyfill localStoreage
if (!global.localStorage)   Object.defineProperty(global, "localStorage", { value: new nodels.LocalStorage(localstorepath),  configurable: false, enumerable: true, writable: false });

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

/*
 * filesystem helpers
 */

const fsstat = (path) => { try { return fs.statSync(path) } catch (e) {} };
const isDirectory = (path) => {
    let stat = fsstat(path);
    return stat ? stat.isDirectory() : false
};
const isFile = (path) => {
    let stat = fsstat(path);
    return stat ? stat.isFile() : false
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

ensureDir(cachepath);
ensureDir(localstorepath);

/*
 * thoregon setup
 */



/**
 * Bootloader for sovereign nodes
 *
 * directly implements resolving and loading:
 * - builtin    node builtin modules
 * - local node modules     node standard
 * - local mapping          simmilar to tdev loader and server for browser
 * - data urls
 *
 * plugiins for additional loaders
 * - repository/dorifer
 *
 * todo [REFACTOR]
 *  - test node > v16 esm module interface --> https://nodejs.org/docs/latest-v17.x/api/esm.html
 *  - implement thoregon repository loaders
 *
 * @see: https://nodejs.org/api/esm.html#esm_loaders
 *
 * @author: blukassen
 */

const loaders = [];

export default class Bootloader {

    constructor() {
        // thoregonloader.ensureCache();
    }

    /**
     * @param {string} specifier
     * @param {{
     *   conditions: !Array<string>,
     *   parentURL: !(string | undefined),
     * }} context
     * @param {Function} defaultResolve
     * @returns {Promise<{ url: string }>}
     */
    async resolve(specifier, context, defaultResolve) {
        let { conditions, parentURL } = context || {};
        logger.debug(`loader : $$ resolve('${specifier}') from: '${parentURL}'`);

        let loader = this.selectLoader(specifier, context);
        if (!loader && specifier.startsWith('/') && !((specifier.match(/\//g) || []).length > 1)) specifier = specifier.substr(1);
        if (!loader && specifier.startsWith('/@')) specifier = specifier.substr(1);
        let resolved;
        if (loader) {
            resolved = await loader.resolve(specifier, context, defaultResolve);
        } else {
            try {
                resolved = defaultResolve(specifier, context, defaultResolve);
            } catch (e) {
                // redirect to 'node_modules' of the thoregon installation
                resolved = defaultResolve(specifier, { parentURL: "file:///"+ process.cwd() + "/thoregon.mjs", conditions: context.conditions }, defaultResolve);
            }
        }
        return resolved;
    }

    /**
     * - node ESM module loader >= v16
     * does getFormat, getSource and transformSource at once
     *
     * @param {string} url
     * @param {{
    format: string,
              }} context If resolve settled with a `format`, that value is included here.
                 * @param {Function} defaultLoad
                 * @returns {Promise<{
                format: string,
                source: string | ArrayBuffer | SharedArrayBuffer | Uint8Array,
              }>}
     */
     async load(url, context, defaultLoad) {
        let loader = this.selectLoader(url, context);
        return (loader && loader.load)
               ? await loader.load(url, context, defaultLoad)
               : defaultLoad(url, context, defaultLoad);
    }

    /**
     * - node ESM module loader < v16
     * @param {string} href
     * @param {Object} context (currently empty)
     * @param {Function} defaultGetFormat
     * @returns {Promise<{ format: string }>}
     */
    async getFormat(url, context, defaultGetFormat) {
        let loader = this.selectLoader(url, context);
        return (loader && loader.getFormat)
                ? await loader.getFormat(url, context, defaultGetFormat)
                : defaultGetFormat(url, context, defaultGetFormat);
    }

    /**
     * - node ESM module loader < v16
     * retrive source
     * @param {string} href
     * @param {{ format: string }} context
     * @param {Function} defaultGetSource
     * @returns {Promise<{ source: !(string | SharedArrayBuffer | Uint8Array) }>}
     */
    async getSource(url, context, defaultGetSource) {
        let loader = this.selectLoader(url, context);
        return (loader && loader.getSource)
                ? await loader.getSource(url, context, defaultGetSource)
                : defaultGetSource(url, context, defaultGetSource);
    }

    /**
     * - node ESM module loader < v16
     * used for 'dynamic' imports from
     * - universe
     * - global
     * - thoregon
     * - matter
     *
     * @param {!(string | SharedArrayBuffer | Uint8Array)} source
     * @param {{
     *   format: string,
     *   url: string,
     * }} context
     * @param {Function} defaultTransformSource
     * @returns {Promise<{ source: !(string | SharedArrayBuffer | Uint8Array) }>}
     */
    async transformSource(source, context, defaultTransformSource) {
        const { url, format } = context || {};
        const loader = this.getLoader(new URL(url)); // todo [DECIDE]: should distinguish between loader and transformer?
        return (loader && loader.transformSource)
                ? await loader.transformSource(source, context, defaultTransformSource)
                : defaultTransformSource(source, context, defaultTransformSource);
    }

    /**
     * todo [REFACTOR]: create thoregon globals here
     * @returns {string} Code to run before application startup
     */
    getGlobalPreloadCode() {
        console.log("Globals defined");
        return ``;
    }

    //
    // specialized loaders
    //

    selectLoader(specifier, context) {
        const entry = loaders.find( (entry) => entry.loader.isResponsible(specifier, context));
        return entry && entry.loader.isReady() ? entry.loader : undefined;
    }

    getLoader(name) {
        const entry = loaders[name];
        return entry && entry.loader.isReady() ? entry.loader : undefined;
    }

    findRoot(resolvedurl) {
        const entry = loaders.map( (entry) => entry.loader.didResolve(resolvedurl)).find((entry) => !!entry);
        return entry?.specifier;
    }

    addLoader(name, loader, sig) {
        // todo: check signature
        loaders.push({ name, loader, sig });
    }

    getTransformer(source) {}

}

/**
 * take this template to implement a new module moader
 */
class LoaderTemplate {

    isResponsible(specifier, context) {
        return false;
    }

    didResolve(resolvedurl) {
        // return false | true
    }

    asSpecifier(resolvedurl) {}

    isReady() {
        return true;
    }

    /**
     * if responsible resolve to the target url
     *
     * @param {string} specifier
     * @param {{
     *   conditions: !Array<string>,
     *   parentURL: !(string | undefined),
     * }} context
     * @param {Function} defaultResolve
     * @return {Promise<{ url: string }>}
     */
    async resolve(specifier, context, defaultResolve) {
        return { url: '' };
    }

    /**
     * - node ESM module loader < v16
     * @param {URL} url
     * @param {Object} context (currently empty)
     * @param {Function} defaultGetFormat
     * @returns {Promise<{ format: string }>}
     */
    async getFormat(href, context, defaultGetFormat) {
        return { format: '' };
    }

    /**
     * - node ESM module loader < v16
     * retrive source
     * @param {string} url
     * @param {{ format: string }} context
     * @param {Function} defaultGetSource
     * @returns {Promise<{ source: !(string | SharedArrayBuffer | Uint8Array) }>}
     */
    async getSource(url, context, defaultGetSource) {
        return { source: '' };
    }

    /**
     * - node ESM module loader < v16
     * @param {!(string | SharedArrayBuffer | Uint8Array)} source
     * @param {{
     *   format: string,
     *   url: string,
     * }} context
     * @param {Function} defaultTransformSource
     * @returns {Promise<{ source: !(string | SharedArrayBuffer | Uint8Array) }>}
     */
    async transformSource(source, context, defaultTransformSource) {
        return { source: '' };
    }

    /**
     * - node ESM module loader >= v16
     * does getFormat, getSource and transformSource at once
     *
     * retrive source
     * @param {string} url
     * @param {{ format: string }} context
     * @param {Function} defaultGetSource
     * @returns {Promise<{ source: !(string | SharedArrayBuffer | Uint8Array) }>}
     */
    async load(url, context, defaultLoad) {
        return { format: '', source: '' };
    }
}

class BuiltinLoader {

    isResponsible(specifier, context) {
        return !specifier.startsWith('data:') && this.isBuiltin(specifier);
    }

    didResolve(resolvedurl) {}

    asSpecifier(resolvedurl) {}

    isReady() {
        return true;
    }

    isBuiltin(specifier) {
        if (specifier.startsWith('/')) specifier = specifier.substr(1);
        return builtins.includes(specifier);   // !!builtins.find(builtin => specifier.startsWith(builtin));
    }

    /**
     * if responsible resolve to the target url
     *
     * @param {string} specifier
     * @param {{
     *   conditions: !Array<string>,
     *   parentURL: !(string | undefined),
     * }} context
     * @param {Function} defaultResolve
     * @return {Promise<void>}
     */
    async resolve(specifier, context, defaultResolve) {
        let { conditions, parentURL } = context || {};
        if (specifier.startsWith('/')) specifier = specifier.substr(1);
        let href = `node:${specifier}`;
        return {
            url: href
        }
    }
}

class DirectoryModuleLoader {

    isResponsible(specifier, context) {
        const url      = context.parentURL ? new URL(specifier, context.parentURL) : new URL(specifier);
        const pathname = url.pathname;
        return isDirectory(pathname) && (isFile(`${pathname}/index.mjs`) || isFile(`${pathname}/index.js`));
    }

    didResolve(resolvedurl) {}

    asSpecifier(resolvedurl) {}

    isReady() {
        return true;
    }

    /**
     * if responsible resolve to the target url
     *
     * @param {string} specifier
     * @param {{
     *   conditions: !Array<string>,
     *   parentURL: !(string | undefined),
     * }} context
     * @param {Function} defaultResolve
     * @return {Promise<void>}
     */
    async resolve(specifier, context, defaultResolve) {
        const url = context.parentURL ? new URL(specifier, context.parentURL) : new URL(specifier);
        const pathname = url.pathname;
        let href = (isFile(`${pathname}/index.mjs`))
                    ? `file://${pathname}/index.mjs`
                    : `file://${pathname}/index.js`;
        return {
            url: href
        }
    }

    /**
     * - node ESM module loader < v16
     * @param {URL} url
     * @param {Object} context (currently empty)
     * @param {Function} defaultGetFormat
     * @returns {Promise<{ format: string }>}
     */
    async getFormat(href, context, defaultGetFormat) {
        const i = href.lastIndexOf('.');
        const ext = i ? href.substring(i+1) : 'mjs';
        return {
            format: ext === '.js' ? 'commonjs' : ext === '.wasm' ? 'wasm' : 'module'
        };
    }

    /**
     * - node ESM module loader < v16
     * retrive source
     * @param {string} url
     * @param {{ format: string }} context
     * @param {Function} defaultGetSource
     * @returns {Promise<{ source: !(string | SharedArrayBuffer | Uint8Array) }>}
     */
/*
    async getSource(url, context, defaultGetSource) {
        return defaultGetSource(url, context, defaultGetSource);
    }
*/

    /**
     * - node ESM module loader >= v16
     * load source
     * @param {string} url
     * @param {{ format: string }} context
     * @param {Function} defaultGetSource
     * @returns {Promise<{ format: string, source: !(string | SharedArrayBuffer | Uint8Array) }>}
     */
    /*
        async load(url, context, defaultLoad) {
            return defaultLoad(url, context, defaultLoad);
        }
    */
}

class TDevLoader {

    constructor(props) {
        this._ready  = false;
        this.onReady = () => {};        // set this handler to handle ready file mapping
        this.explore();
    }

    isResponsible(specifier, context) {
        return (this.mapping) ? !!this.findFS(specifier) : false;
    }

    // todo [PERF]: improve
    didResolve(resolvedurl) {
        const parts = resolvedurl.split('/');
        let root;
        do {
            let part = parts.shift();
            if (this.mapping[part]) root = part;
        } while (!root && parts.length > 0);
        if (!root) return;
        return { specifier: '/' + root +'/' + parts.join('/') };
    }

    asSpecifier(resolvedurl) {}

    isReady() {
        return this._ready;
    }

    /*
     * build the root structure
     *  name : { dir: '', entries*: [] }
     */
    explore() {
        // implement by  subclass
    }

    /**
     * lookup if the specifier matches any mapping
     * @param p
     * @return {{path: *, entry: *, fs: *}}
     */
    findFS(p) {
        let parts = p.split(path.sep);
        if (p.startsWith('/')) parts.shift();   // remove the empty part
        if (parts.length === 0) throw Error(`no file reference`);
        let first = parts.shift();
        let fs;
        let entry = this.mapping[first];
        if (!entry) {
            return;
        } else {
            fs = entry.fs;
            entry = entry.entries;
        }
        // if (parts.length > 0) entry = this.crawl(entry, parts);
        return { fs, path: p, entry };
    }

    /**
     * if responsible resolve to the target url
     *
     * @param {string} specifier
     * @param {{
     *   conditions: !Array<string>,
     *   parentURL: !(string | undefined),
     * }} context
     * @param {Function} defaultResolve
     * @return {Promise<{ url: string }>}
     */
    async resolve(specifier, context, defaultResolve) {
        let ref = this.findFS(specifier);
        if (!ref) return defaultResolve(specifier, context, defaultResolve);
        return { url: isFile(path.join(ref.fs, ref.path)) ? 'file://' + path.join(ref.fs, ref.path) : (isFile(`${path.join(ref.fs, ref.path)}/index.mjs`)) ? `file://${path.join(ref.fs, ref.path)}/index.mjs` : `file://${path.join(ref.fs, ref.path)}/index.js` };
    }

    /**
     * - node ESM module loader < v16
     * @param {URL} url
     * @param {Object} context (currently empty)
     * @param {Function} defaultGetFormat
     * @returns {Promise<{ format: string }>}
     */
    /*
        async getFormat(href, context, defaultGetFormat) {
            return { format: '' };
        }
    */

    /**
     * - node ESM module loader < v16
     * retrive source
     * @param {string} url
     * @param {{ format: string }} context
     * @param {Function} defaultGetSource
     * @returns {Promise<{ source: !(string | SharedArrayBuffer | Uint8Array) }>}
     */
    /*
        async getSource(url, context, defaultGetSource) {
            return { source: '' };
        }
    */

    /**
     * - node ESM module loader < v16
     * @param {!(string | SharedArrayBuffer | Uint8Array)} source
     * @param {{
     *   format: string,
     *   url: string,
     * }} context
     * @param {Function} defaultTransformSource
     * @returns {Promise<{ source: !(string | SharedArrayBuffer | Uint8Array) }>}
     */
    /*
        async transformSource(source, context, defaultTransformSource) {
            return { source: '' };
        }
    */

    /**
     * - node ESM module loader >= v16
     *
     * load source
     * @param {string} url
     * @param {{ format: string }} context
     * @param {Function} defaultGetSource
     * @returns {Promise<{ format: string, source: !(string | SharedArrayBuffer | Uint8Array) }>}
     */
    /*
        async load(url, context, defaultLoad) {
            return defaultLoad(url, context, defaultLoad);
        }
    */

}

class ThoregonLoader extends TDevLoader {

    //
    // thoregon setup
    //

    getThoregonMapping() {
        if (!this.t͛) this.t͛ = t͛();
        return this.t͛;
    }

    /*
     * build the root structure
     *  name : { dir: '', entries*: [] }
     */
    explore() {
        if (this.mapping) return;
        let t͛ = this.getThoregonMapping();
        // build a mapping with 1) static file objects, 2) thoregon modules, 3) dev modules
        this.mapping = t͛;
        this._ready = true;

        try {
            this.onReady();
        } catch (e) {
            console.log("Error in 'onReady' handler: ", e);
        }
    }

}

class DevComponentLoader extends TDevLoader {

    //
    // components setup
    //

    async getComponentMapping() {
        if (!this.c) this.c = await c();
        return this.c;
    }

    /*
     * build the root structure
     *  name : { dir: '', entries*: [] }
     */


    async explore() {
        if (this.mapping) return;
        let c = await this.getComponentMapping();

        // build a mapping with 1) static file objects, 2) thoregon modules, 3) dev modules
        this.mapping = c;
        this._ready = true;

        try {
            this.onReady();
        } catch (e) {
            console.log("Error in 'onReady' handler: ", e);
        }
    }
}

// loaders.push( { name: 'node', loader: new BuiltinLoader() } );
loaders.push( { name: 'module', loader: new DirectoryModuleLoader() } );
loaders.push( { name: 'devthoregon', loader: new ThoregonLoader() } );
loaders.push( { name: 'devcomponent', loader: new DevComponentLoader() } );
