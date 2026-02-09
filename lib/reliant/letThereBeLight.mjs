/**
 * This init can be used as convenient single line initialization.
 * Returns the universe for easy dependency injection.
 *
 * @author: blukassen
 */

import baseDB   from "/evolux.universe/lib/reliant/basedb.mjs";
import universe from '../universeC.mjs';

// const universe = {};


const applyProperties = (object, universe, defaultname) => {
    for (let property in object) {
        // todo: check if its the 'default' export and name it after the config
        // todo: log warning if 'register' returns false
        if (!object.hasOwnProperty || object.hasOwnProperty(property)) {
            if (property === 'default') {
                let regex = /^universe\.(.*)\.mjs/i;
                let match = regex.exec(defaultname);
                if (match.length > 1) {
                    universe.registerDefault(match[1], object[property]);
                }
            } else {
                universe.register(property, object[property]);
            }
        }
    }
};

export default function letThereBeLight(configname) {
    return new Promise(async (resolve,reject) => {
        const logger = universe.logger;

        try {
            logger.debug("$$ letThereBeLight: start");
            thoregon.checkpoint("§§ letThereBeLight 1");
            let env = { logger };

            if (window.DEV) {
                logger.debug("$$ letThereBeLight: DEV");
                universe.ssi = DEV.ssi;
            }

            // load all config scripts in the inflation phase
            const configpath = `/setup/universe.remote.config.mjs`;
            let exports = await thoregon.import(configpath); // await import('/etc/universe.config.mjs');
            thoregon.checkpoint("§§ letThereBeLight 2");
            universe.stage = env.stage;
            universe.env = env;

            applyProperties(exports, universe, 'universe.config.mjs');
            thoregon.checkpoint("§§ letThereBeLight 3");

            await universe.letThereBeLight();
            thoregon.checkpoint("§§ letThereBeLight 5");
            logger.debug("$$ letThereBeLight: end");

            // universe inflated, go on
            await resolve(universe);
            // emit first level universe properties as event
            universe.emitAllGlobalEvents();
            thoregon.checkpoint("§§ letThereBeLight 6");
            // (async () => await dorifer.restartApp())();
        } catch (err) {
            logger.error(`$$ letThereBeLight: error`, err);
            try { await reject(err) } catch(e) {};
            // todo: proper handling in the browser
            // process.exit(1);
        }
    });
}
