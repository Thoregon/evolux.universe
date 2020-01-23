/**
 * This init can be used as convenient single line initialization.
 * Returns the universe for eays dependency injection.
 *
 * @author: blukassen
 */

import setup from '../setup.mjs';
import config from './config.mjs';
import universe from '../universe.mjs';

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

            // load all config scripts in the 'protouniverse' phase
            let exports = await config(env);

            // vanish the 'protouniverse' and expose the 'universe'
            let proto = global.protouniverse;
            if (global && global.protouniverse) {
                delete global.protouniverse;
            }

            universe.stage = env.stage;
            Object.assign(universe.env, env);

            for (let name in exports) applyProperties(exports[name], universe, name);
            universe.applyProto(proto);  // all settings from the protouniverse
            global.universe = universe;

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
