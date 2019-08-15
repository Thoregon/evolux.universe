/**
 *
 *
 * @author: blukassen
 */

import path         from 'path';
// import StackTrace   from 'stacktrace-js';

/**
 * init config. Reads config from the specified config file: setup.env.configFile
 * If the config file, which is an executable JS, if it produces errors the process will exit.
 *
 * @see setup.mjs.js
 *
 * @param {Object} env - invoke with 'setup.env'
 */

export default async function (env) {
    let logger = env.logger;
    // run the config; if it produces errors --> exit
    try {
        logger.debug("$$ config: start");
        // import the config files
        let cfgfiles = env.universeFiles;
        let exports = {};
        for (let cfgfile of cfgfiles) {
            exports[path.basename(cfgfile)] = await import(cfgfile);
        }

        logger.debug("$$ config: end");

        return exports;
    } catch (err) {
        // let stack = await StackTrace.get(err);
        logger.error(`$$ config: error -> ${err}`);
        process.exit(1);
    }
};
