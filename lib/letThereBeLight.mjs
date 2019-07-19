/**
 * This init can be used as convenient single line initialization.
 * Returns the universe for eays dependency injection.
 *
 * @author: blukassen
 */

import setup from './setup.mjs';
import config from '../config.mjs';
// import protouniverse from './protouniverse.mjs';
import universe from './universe.mjs';

const whichGlobal = () => (!this && !!global) ? global : window;

export default async function letThereBeLight() {
    return new Promise((resolve, reject) => {
        const logger = universe.logger;

        try {
            const space = whichGlobal();    // choose the right global namespace
            logger.debug("$$ letThereBeLight: start");
            let env = setup.env;

            // publish the 'protouniverse'
            // space.protouniverse = protouniverse;

            // load all config scripts in the 'protouniverse' phase
            config(env);

            // vanish the 'protouniverse' and expose the 'universe'
            let proto = space.protouniverse;
            delete space.protouniverse;
            space.universe = universe;

            setTimeout(() => {
                // now inflate the universe
                universe.apply(proto);
                // set variables after reading the universe file to enable override of variables
                if (env.vars) {
                    let vars = env.vars;
                    for (let property in vars) {
                        if (vars.hasOwnProperty(property)) universe.register(property, vars[property]);
                    }
                }
                universe.letThereBeLight()
                    .then(() => resolve(universe));
                logger.debug("$$ letThereBeLight: end");
            }, 110);
        } catch (e) {
            logger.error("$$ letThereBeLight: error -> %s", e);
            process.exit(1);
        }
    });
}

/*
export default async function letThereBeLight() {
    const logger = universe.logger;

    try {
        const space = whichGlobal();    // choose the right global namespace
        logger.debug("$$ letThereBeLight: start");

        // publish the 'protouniverse'
        space.protouniverse = protouniverse;

        // load all config scripts in the 'protouniverse' phase
        config(setup.env);
        // now inflate the universe
        universe.apply(protouniverse);
        await universe.letThereBeLight();
        logger.debug("$$ letThereBeLight: end");

        // vanish the 'protouniverse' and expose the 'universe'
        delete space.protouniverse;
        space.universe = universe;

        return universe;
    } catch (e) {
        logger.error("$$ letThereBeLight: error -> %s", e);
        process.exit(1);
    }
}

 */
