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

export default function letThereBeLight() {
    return new Promise(async (resolve,reject) => {
        const logger = universe.logger;

        try {
            let DEV;        // will eventually be specified by 'universe.dev.mjs' for development mode

            logger.debug("$$ letThereBeLight: start");
            let env = setup().env;

            // load all config scripts in the inflation phase
            let exports = await config(env);

            universe.stage = env.stage;
            Object.assign(universe.env, env);

            for (let name in exports) applyProperties(exports[name], universe, name);

            if (exports['universe.dev.mjs']) DEV = exports['universe.dev.mjs'].DEV;

            // set variables after reading the universe file to enable override of variables
            if (env.vars) applyProperties(env.vars, universe, 'universe');

            await universe.letThereBeLight();
            logger.debug("$$ letThereBeLight: end");

            // if an SSI is specified in dev mode use it
            if (DEV?.ssi) {
                universe.Identity.addEventListener('auth', async () => await dorifer.restartApp() );
                await universe.Identity.useIdentity(DEV.ssi);
            }

            await resolve(universe);
            // emit first level universe properties as event
            universe.emitAllGlobalEvents();
        } catch (err) {
            logger.error("$$ letThereBeLight error", err);
            try { await reject(err) } catch(e) {};
            process.exit(1);
        }
    });
}

setInterval(() => {}, 1000);
