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

import fs               from 'fs';
import path             from 'path';
import yargs            from 'yargs';
import { bootlogger }   from './bootutil.mjs';

const DEFAUTLT_CONFIG_FILENAME = 'universe.config.mjs';

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

let setup = ((configroot) => {
    logger.debug("$$ setup: start");

    const env = process.env;

    let _env = {
        stage: 'DEV',
        basedir: './',
        logger: logger,  // publish the logger
        universe: [DEFAUTLT_CONFIG_FILENAME]       // init with the standard config file name
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
        .option('c', {
            alias: 'cfg',
            description: 'specify config file'
          })
        .option('b', {
            alias: 'basedir',
            description: 'specify base directory'
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
    let cfgpath = configroot ? path.join(_env.basedir, configroot) : _env.basedir;
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
        }
    }

    if (argv.let) {
        let l = argv.let;
        _env.vars = {};
        for (let i in l) {
            let part = l[i];
            let parts = part.split("=");
            if (parts.length === 2) _env.vars[parts[0]] = parts[1];
        }
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
