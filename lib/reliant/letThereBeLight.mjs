/**
 * This init can be used as convenient single line initialization.
 * Returns the universe for easy dependency injection.
 *
 * @author: blukassen
 */

import config   from '/evolux.universe/config.mjs';
import universe from '/evolux.universe/lib/universe.mjs';

export {default as protouniverse } from '/evolux.universe/lib/protouniverse.mjs'
export * from '/evolux.universe/lib/bootutil.mjs'

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
        const space = window;    // choose the right global namespace
        logger.debug("$$ letThereBeLight: start");
        let env = { logger };

        // load all config scripts in the 'protouniverse' phase
        let exports = await config(env);
        universe.stage = env.stage;
        universe._env = env;

        // vanish the 'protouniverse' and expose the 'universe'
        let proto = space.protouniverse;
        if (space && space.protouniverse) {
            delete space.protouniverse;
        }

        for (let name in exports) applyProperties(exports[name], universe, name);
        universe.apply(proto);  // all settings from the protouniverse
        space.universe = universe;

        await universe.letThereBeLight();
        logger.debug("$$ letThereBeLight: end");

        return universe;
    } catch (err) {
        logger.error(`$$ letThereBeLight: error`, err);
        // todo: proper handling in the browser
        // process.exit(1);
    }
}
