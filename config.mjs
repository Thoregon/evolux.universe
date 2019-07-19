/**
 *
 *
 * @author: blukassen
 */

import universe from './lib/universe.mjs';

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
        // publish argv to universe
        // reuse the logger from setup; can be overwritten by the universe config(s)
        universe.logger = logger;
        // set origin; yes, hard overwrite other settings
        universe.stage = env.stage;
        let cfgfiles = universe.universeFiles = env.universeFiles;

        let exports = await importCfgs(cfgfiles);

        logger.debug("$$ config: end");
    } catch (e) {
        logger.error("$$ config: error -> %s", e);
        process.exit(1);
    }
};

const importCfgs = (cfgfiles) => {
    return new Promise((resolve, reject) => {
        let proc = [];
        for (let cfgfile of cfgfiles) {
            proc.push(import(cfgfile));
        }
        Promise.all(proc)
            .then(() => {
                setTimeout(() => {
                    resolve();
                }, 10);
            })
            .catch(reject);
    });
};
