/**
 *
 *
 * @author: blukassen
 */

import path         from 'path';
import { emsg }     from "/evolux.supervise";
// import StackTrace   from 'stacktrace-js';

const ISWIN = path.sep === '\\';

/**
 * init config. Reads config from the specified config file: setup.env.configFile
 * If the config file, which is an executable JS, if it produces errors the process will exit.
 *
 * @see setup.mjs.js
 *
 * @param {Object} env - invoke with 'setup.env'
 */

import { bootlogger }   from '../bootutil.mjs';

export default async function (env) {
    let logger = bootlogger;
    // run the config; if it produces errors --> exit
    try {
        logger.debug("$$ config: start");
        // import the config files
        let cfgfiles = env.universeFiles;
        let exports = {};
        for (let cfgfile of cfgfiles) {
            const cfg = ISWIN ? `file:///${cfgfile}` : cfgfile;
            exports[path.basename(cfgfile)] = await import(cfg);
        }

        logger.debug("$$ config: end");

        return exports;
    } catch (e) {
        // let stack = await StackTrace.get(e);
        logger.error(`$$ config error`, e);
        process.exit(1);
    }
};
