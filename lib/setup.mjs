/**
 * This is the setup for services and tests. Settings will be published to (the) universe.
 *
 * Ready from
 *  - command line args
 *  - environment variables
 *  - uses default values
 *
 * What can be defined:
 *  - stage: () default DEV
 *  - basedir: default current dir
 *  - cfg: alternative config file
 *
 * Just delivers settings to get the config. Go ahead initializing the config.
 *
 * Checks:
 * - Valid stage
 * - Valid and exisiting basedir
 * - Existing config file
 *
 * @author: blukassen
 */

import fs             from 'fs';
import path           from 'path';
import Yargs          from 'yargs';
import process        from "process";
import crypto         from "crypto";
import dotenv         from "dotenv";
import { bootlogger } from './bootutil.mjs';
import Module         from "module";
import nodels         from "node-localstorage";
import Bootloader     from "./loader/bootloader.mjs";

const bootloader = new Bootloader();

dotenv.config();

const baseURL           = new URL(`${process.cwd()}/`, 'file://');

// check for the 'dev' switch now because this setting is immutable
const isDev = process.argv.includes("-d");

const cachepath = './.thoregon/jscache';
const localstorepath = './.thoregon/localStore';

// some constants to check what to resolve
const builtins = Module.builtinModules;

// '.tcd'   ... Thoregon Component Descriptor
// '.tvs'   ... Thoregon Vault Store
// const JS_EXTENSIONS     = new Set(['.js', '.mjs', '.json', '.sh', '.tcd', '.tvs']);    // todo: enable extensions with bootloader plugin
// const thoregonloader    = new ThoregonLoader({ root: './', cachelocation: cachepath});

// polyfill localStoreage
if (!global.localStorage) Object.defineProperty(global, "localStorage", {
    value: new nodels.LocalStorage(localstorepath),
    configurable: false,
    enumerable: true,
    writable: false
});

//
// source
//

async function resolveLocation(specifier/*, parentURL*/) {
    const nextResolve = (specifier, context) => {
        const url      = context.parentURL ? new URL(specifier, context.parentURL) : new URL(specifier, 'file:/'+process.cwd()+'/thoregon.mjs');
        return {
            url,
            shortCircuit: true  // NodeJS 18.x
        }
    }

    const nextLoad = (specifier, context) => {
        try {
            const fpath = specifier.substring(6);
            const source = (fs.readFileSync(fpath)).toString('utf8');
            return {
                source,
                shortCircuit: true  // NodeJS 18.x
            };
        } catch (ignore) {}
    }

    try {
        if (!specifier) return;

        if (specifier.startsWith('file:')) {
            const loaded = nextLoad(specifier);
            const source = loaded?.source;
            return source;
        }

        const procContext = { parentURL: /*parentURL ??*/ 'file:/'+process.cwd()+'/thoregon.mjs' };

        const resolved = await bootloader.resolve(specifier, procContext, nextResolve);
        const url = resolved?.url;

        return typeof url === 'string' ? url : undefined;
        /*
                if (!url) return;

                const loaded = await bootloader.load(url, procContext, nextLoad);
                const source = loaded?.source;
                return source;
        */
    } catch (ignore) {
        console.log("source error", ignore);
    }
}

async function content(specifier) {
    const url = await resolveLocation(specifier);
    if (!url) return;
    const filename = url.substring(7);
    const content = fs.readFileSync(filename);
    return content;
}

async function source(specifier/*, parentURL*/) {
    specifier = decodeURIComponent(specifier);
    const nextResolve = (specifier, context) => {
        const url      = context.parentURL ? new URL(specifier, context.parentURL) : new URL(specifier, 'file:/'+process.cwd()+'/thoregon.mjs');
        return {
            url,
            shortCircuit: true  // NodeJS 18.x
        }
    }

    const nextLoad = (specifier, context) => {
        try {
            const i = specifier.indexOf('/C:');
            const fpath = i > -1 ?  specifier.substring(i+1) : specifier.substring(6);
            const source = (fs.readFileSync(fpath)).toString('utf8');
            return {
                source,
                shortCircuit: true  // NodeJS 18.x
            };
        } catch (ignore) {
            console.log(ignore);
            debugger;
        }
    }

    try {
        if (!specifier) return;

        if (specifier.startsWith('file:')) {
            const loaded = nextLoad(specifier);
            const source = loaded?.source;
            return source;
        }

        const parenturl = ('file:/'+process.cwd()+'/thoregon.mjs').replaceAll('\\', '/');
        const procContext = { parentURL: /*parentURL ??*/ 'file:/'+process.cwd()+'/thoregon.mjs' };

        const resolved = await bootloader.resolve(specifier, procContext, nextResolve);
        const url = resolved?.url;
        if (!url) return;

        const loaded = await bootloader.load(url, procContext, nextLoad);
        const source = loaded?.source;
        return source;
    } catch (ignore) {
        console.log("source error", ignore);
    }
}

//-------------------------------------------------------------

const thoregon = {};
// *** some test methods
Object.defineProperties(thoregon, {
    'ui'               : { value: false, configurable: false, enumerable: true, writable: false },
    'isBrowser'        : { value: false, configurable: false, enumerable: true, writable: false },
    'isReliant'        : { value: false, configurable: false, enumerable: true, writable: false },
    'isNode'           : { value: true, configurable: false, enumerable: true, writable: false },
    'isSovereign'      : { value: true, configurable: false, enumerable: true, writable: false },
//    'bootloader'       : { value: bootloader, configurable: false, enumerable: true, writable: false },
    'nature'           : { value: 'sovereign', configurable: false, enumerable: true, writable: false },
    'density'          : { value: 'headless', configurable: false, enumerable: true, writable: false }, // todo: add 'headed' for Electron and mobile apps
    'addLoader'        : { value: (name, loader, sig) => bootloader.addLoader(name, loader, sig), configurable: false, enumerable: false, writable: false },
    'birth'            : { value: Date.now(), configurable: false, enumerable: true, writable: false },
    'since'            : { get: () => Date.now() - thoregon.birth, configurable: false, enumerable: true },
    'checkpoint'       : { value: (msg) => console.log(msg, Date.now() - thoregon.birth), configurable: false, enumerable: true, writable: false },
    'isDev'            : { value: isDev, configurable: false, enumerable: true, writable: false },
    'debug'            : { value: false, configurable: false, enumerable: true, writable: false },
    'activateFirewalls': { value: async () => {} /*await protouniverse?.activateFirewalls()*/, configurable: false, enumerable : true, writable: false },
    'loader'           : { value: bootloader, configurable: false, enumerable: true, writable: false },
    'source'           : { value: source, configurable: false, enumerable: false, writable: false },
    'content'          : { value: content, configurable: false, enumerable: false, writable: false },
    'location'         : { value: resolveLocation, configurable: false, enumerable: false, writable: false },
});

/*
 * define some globals
 */
const properties = {};

if (!global.thoregon)   properties.thoregon   = { value: thoregon,  configurable: false, enumerable: true, writable: false };
if (!global.globalThis) properties.globalThis = { value: global,    configurable: false, enumerable: true, writable: false };
if (!global.crypto)     properties.crypto     = { value: { subtle: crypto.webcrypto.subtle, getRandomValues: crypto.webcrypto.getRandomValues.bind(crypto.webcrypto), CryptoKey: crypto.webcrypto.KeyObject }, configurable: false, enumerable: true, writable: false };
if (!global.CryptoKey)  properties.CryptoKey  = { value: crypto.webcrypto.CryptoKey, configurable: false, enumerable: true, writable: false };

if(typeof btoa === "undefined"){
    global.btoa = (data) => Buffer.from(data, "binary").toString("base64");
    global.atob = (data) => Buffer.from(data, "base64").toString("binary");
}

Object.defineProperties(global, properties);


//
// Polyfill essential behavior
// todo [REFACTOR]: extract to vanillaT
//

if (!Object.prototype.hasOwnProperty('$thoregonEntity')) Object.defineProperty(Object.prototype, '$thoregonEntity', { configurable: false, enumerable: false, writable: false, value: undefined });
// if (!Function.prototype.metaClass) Object.defineProperty(Function.prototype, 'metaClass', { configurable: false, enumerable: false, writable: false, value: function ({ url } = {}, metaClass) { return this._metaclass } });
if (!Function.prototype.hasOwnProperty('checkIn')) Object.defineProperty(Function.prototype, 'checkIn', { configurable: false, enumerable: false, writable: false, value: function ({ url } = {}, metaClass) { globalThis.dorifer?.checkinClass(url, this, metaClass) } });

thoregon.checkpoint("§§ setup start");

const yargs = Yargs();

const ETC = './etc';
const DEFAUTLT_CONFIG_FILENAME = 'universe.config.mjs';

const isDirectory = source => fs.existsSync(source) && fs.statSync(source).isDirectory();

// just init a logger to provide messages at start; before any config is loaded there is no other
const logger = bootlogger;

const getUniverseFiles = (stage, basedir, filenames) => {
    let resolved = [];
    for (let filename of filenames) {
        let universeFile = path.join(basedir, filename);
        if (fs.existsSync(universeFile)) {
            resolved.push(universeFile);
        } else {
            if (filename === DEFAUTLT_CONFIG_FILENAME) {
                logger.log("info", `default config not available: '${universeFile}'`);
            } else {
                logger.log("warning", `Stage (${stage}) config not found: '${universeFile}'`);
            }
        }
    }
    return resolved;
};

const getPeerConfigFiles = (basedir) => {
    let find = /^peer_.*config\.mjs$/;
    if (isDirectory(basedir)) {
        let dircontent = fs.readdirSync(basedir);
        return dircontent.filter(item => item.match(find)).sort().map(filename => path.join(basedir, filename));
    }
    return [];
};

let setup = ((configroot) => {
    logger.debug("$$ setup: start");

    const env = process.env;

    let _env = {
        stage: 'PROD',
        basedir: './',
        pubroot: './',
        universe: [DEFAUTLT_CONFIG_FILENAME],       // init with the standard config file name
        //...env
    };

    let argv = yargs
        .usage('Usage: $0 [options]')
        .help('help')
        .version('v', 'display version information', '1.0')
        .alias('v', 'version')
        .option('h', {
            alias: 'help',
            description: 'display help message'
        })
        //.env("STAGE")
        .option('s', {
            alias: 'stage',
            description: 'specify stage name'
            // choices: Object.getOwnPropertyNames(validStages)
        })
        //.alias('s', 'stage')
        //.describe('s', 'choose stage')
        //.choices('s', ['playground', 'dev', 'ftest', 'ltest', 'preprod', 'production'])
        .option('e', {
            alias: 'etc',
            description: 'specify etc dir'
        })
        .option('c', {
            alias: 'cfg',
            description: 'specify config file'
          })
        .option('b', {
            alias: 'basedir',
            description: 'specify base directory'
          })
        .option('p', {
            alias: 'pubroot',
            description: 'specify base directory for www pub'
        })
        .option('u', {
            alias: 'uiroot',
            description: 'specify base directory for UI'
        })
        .option('p', {
            alias: 'serviceport',
            description: 'specify port for service API'
        })
        .option('d', {
            alias: 'dev',
            description: 'use dev mode'
        })
        .option('l', { // document options.
            array: true, // even single values will be wrapped in [].
            alias: 'let',
            description: 'a list of variable declarations, overrides vars from config. Form: -l var1=val1 var2=val2',
            // default: 'stage=DEV',
          })
        .epilog('for more information visit https://thoregon.io')
        .argv;

    _env.argv = argv;

    // check the 'stage' param
    if (!!argv.stage) {
        _env.stage = argv.stage;
    } else if (!!env.THOREGON_STAGE) {
        _env.stage = env.THOREGON_STAGE;
    }

    if (_env.stage) _env.universe.push(`universe.${_env.stage.toLowerCase()}.mjs`);

    // check the 'basedir' param
    if (!!argv.basedir) {
        _env.basedir = argv.basedir;
    } else if (!!env.THOREGON_BASEDIR) {
        _env.basedir = env.THOREGON_BASEDIR;
    }

    // check the 'pubdir' param
    if (!!argv.pubroot) {
        _env.pubroot = argv.pubroot;
    } else if (!!env.pubroot) {
        _env.pubroot = env.pubroot;
    }

    // check the 'uiroot' param
    if (!!argv.uiroot) {
        _env.uiroot = argv.uiroot;
    } else if (!!env.uiroot) {
        _env.uiroot = env.uiroot;
    }

    // check the 'serviceport' param
    if (!!argv.serviceport) {
        _env.serviceport = argv.serviceport;
    } else if (!!env.serviceport) {
        _env.serviceport = env.serviceport;
    }


    if (argv.etcdir) {
        _env.etcdir = argv.etcdir;
        configroot = _env.etcdir;
    } else if (env.etcdir) {
        _env.etcdir = env.etcdir;
        configroot = _env.etcdir;
    }

    if (argv.logdir) {
        _env.logdir = argv.logdir;
    } else if (env.logdir) {
        _env.logdir = env.logdir;
    }

    // check the 'config' param; has no ENV var
    if (!!argv.cfg) {
        if (!fs.existsSync(argv.cfg)) {
            logger.log("error", "unknown config:", argv.cfg);
            process.exit(1);
        }
        _env.universe = [argv.cfg];
    }

    // check if basedir exists
    _env.basedir = _env.basedir ? _env.basedir.startsWith('/') ? _env.basedir : path.join(process.cwd(), _env.basedir) : process.cwd();
    if (!fs.existsSync(_env.basedir)) {
        logger.log("error", "unknown basedir:", _env.basedir);
        process.exit(1);
    } else {
        let stats = fs.statSync(_env.basedir);
        if (!stats.isDirectory()) {
            logger.log("error", "basedir is not  directory:", _env.basedir);
            process.exit(1);
        }
    }

    // _env.universeFile = path.join(_env.basedir, _env.universe);
    let cfgpath = configroot ? path.join(_env.basedir, configroot) : path.join(_env.basedir, ETC);
    _env.universeFiles = getUniverseFiles(_env.stage, cfgpath, _env.universe);

    for (let cfgfile of _env.universeFiles) {
        // check if config exists
        if (!fs.existsSync(cfgfile)) {
            logger.log("error", "unknown config:", cfgfile);
        } else {
            let stats = fs.statSync(cfgfile);
            if (!stats.isFile()) {
                logger.log("error", "config is not a file:", cfgfile);
                process.exit(1);
            }
            console.log("$$    config:", cfgfile);
        }
    }

    let peercfgfiles = getPeerConfigFiles(cfgpath);
    _env.universeFiles = _env.universeFiles.concat(peercfgfiles);

    if (argv.let) {
        let l = argv.let;
        for (let i in l) {
            let part = l[i];
            let parts = part.split("=");
            if (parts.length === 2) _env[parts[0]] = parts[1];
        }Ï
    }

    let setup = {};

    Object.defineProperty(setup, 'env', {
      get: () => { return _env; },
      enumerable: true,
      configurable: false
    });

    logger.debug("$$ setup: end");
    return setup;
});

export default setup;
