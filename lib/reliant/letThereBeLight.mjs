/**
 * This init can be used as convenient single line initialization.
 * Returns the universe for easy dependency injection.
 *
 * @author: blukassen
 */

// import config                       from '/evolux.universe/config.mjs';
import universe                     from '../universe.mjs';

// export *                            from '/evolux.universe/lib/bootutil.mjs'

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
            logger.debug("$$ letThereBeLight: start");
            let env = { logger };

            // load all config scripts in the inflation phase
            let exports = await import('/universe.config.mjs');
            universe.stage = env.stage;
            universe.env = env;

            applyProperties(exports, universe, 'universe.config.mjs');
            // for (let name in exports) applyProperties(exports[name], universe, name);

            await universe.letThereBeLight();
            logger.debug("$$ letThereBeLight: end");

            await resolve(universe);
            // emit first level universe properties as event
            universe.emitAllGlobalEvents();
        } catch (err) {
            logger.error(`$$ letThereBeLight: error`, err);
            try { await reject(err) } catch(e) {};
            // todo: proper handling in the browser
            // process.exit(1);
        }
    });
}
