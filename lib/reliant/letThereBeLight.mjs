/**
 * This init can be used as convenient single line initialization.
 * Returns the universe for easy dependency injection.
 *
 * @author: blukassen
 */

import universe                     from '../universe.mjs';

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
            thoregon.checkpoint("§§ letThereBeLight 1");
            let env = { logger };

            // load all config scripts in the inflation phase
            let exports = await import('/etc/universe.config.mjs');
            thoregon.checkpoint("§§ letThereBeLight 2");
            universe.stage = env.stage;
            universe.env = env;

            applyProperties(exports, universe, 'universe.config.mjs');
            thoregon.checkpoint("§§ letThereBeLight 3");

            try {
                const extendedconf = (thoregon.isDev) ? 'universe.dev.mjs' : 'universe.prod.mjs';
                exports            = await import('/etc/' + extendedconf);
                applyProperties(exports, universe, extendedconf);

                if (thoregon.isDev) DEV = exports.DEV;
            } catch (e) {
                console.error(e);
            }
            thoregon.checkpoint("§§ letThereBeLight 4");


            // for (let name in exports) applyProperties(exports[name], universe, name);

            await universe.letThereBeLight();
            thoregon.checkpoint("§§ letThereBeLight 5");
            logger.debug("$$ letThereBeLight: end");

            // if an SSI is specified in dev mode use it
            // if (DEV?.ssi) {
            //     universe.Identity.addListener('auth', async () => {} );  // await dorifer.restartApp()
            //     await universe.Identity.useIdentity(DEV.ssi);
            // }

            // universe inflated, go on
            await resolve(universe);
            // emit first level universe properties as event
            universe.emitAllGlobalEvents();
            thoregon.checkpoint("§§ letThereBeLight 6");
            (async () => await dorifer.restartApp())();
        } catch (err) {
            logger.error(`$$ letThereBeLight: error`, err);
            try { await reject(err) } catch(e) {};
            // todo: proper handling in the browser
            // process.exit(1);
        }
    });
}
