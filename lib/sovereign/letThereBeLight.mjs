/**
 * This init can be used as convenient single line initialization.
 * Returns the universe for eays dependency injection.
 *
 * @author: blukassen
 */

import setup from '../setup.mjs';
import config from './config.mjs';
import universe from '../universe.mjs';

// this is a cryptic way to get the 'global' object or 'window' in strict mode. direct code references will throw an error
const space = globalThis;

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

export default async function letThereBeLight() {
        const logger = universe.logger;

        try {
            logger.debug("$$ letThereBeLight: start");
            let env = setup().env;

            // publish the 'protouniverse'
            // space.protouniverse = protouniverse;

            // load all config scripts in the 'protouniverse' phase
            let exports = await config(env);

            // vanish the 'protouniverse' and expose the 'universe'
            let proto = space.protouniverse;
            if (space && space.protouniverse) {
                delete space.protouniverse;
            }

            for (let name in exports) applyProperties(exports[name], universe, name);
            universe.apply(proto);  // all settings from the protouniverse
            space.universe = universe;

            // set variables after reading the universe file to enable override of variables
            if (env.vars) applyProperties(env.vars, universe, 'universe');

            await universe.letThereBeLight();
            logger.debug("$$ letThereBeLight: end");

            return universe;
        } catch (err) {
            logger.error("$$ letThereBeLight error", err);
            process.exit(1);
        }
}
