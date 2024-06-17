/**
 * This init can be used as convenient single line initialization.
 * Returns the universe for eays dependency injection.
 *
 * @author: blukassen
 */

import setup         from '../setup.mjs';
import config        from './config.mjs';
import universe      from '../universe.mjs';
import { ensureDir } from "../loader/fsutils.mjs";
import fs            from "fs";
import util          from "util";
import path          from 'path';

const setupLog = (logdir) => {

    if (global.console) {
        const LOG_DIR  = logdir ?? './log';
        const LOG_FILE = 'neuland.log';

        ensureDir(LOG_DIR);

        const dttm = () => {
            let d = new Date();
            return `[${d.getYear() + 1900}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(4, '0')}]`;
        }

        let log              = console.log.bind(console);
        const logsink        = `${LOG_DIR}/${LOG_FILE}`;
        let logstream        = fs.createWriteStream(logsink, { flags: 'a' });
        universe.atDusk(() => logstream.end(`**** END ${dttm()} ***********************************\n\n`))

        console.log = (...args) => {
            const message = util.format(...args);
            let msg       = args.join(' ');
            logstream.write(`${dttm()} ${msg}\n`);
            log(`${dttm()} ${msg}`);
        }

        console.info = function (...args) {
            console.log('I:', ...args);
        }

        console.warn = function (...args) {
            console.log('W:', ...args);
        }

        console.error = function (...args) {
            console.log('E:', ...args);
        }

        console.debug = function (...args) {
            if (DEBUG) console.log('D:', ...args);
        }

        console.log(`**** START **********************************`);
    }
}

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
            universe.basedir = env.basedir;
            setupLog(env.logdir);

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

            // if an SSI is specified use it
            let SSI = DEV?.ssi ?? universe.IDENTITY;
            if (SSI) {
                universe.Identity.addListener('auth', async () => await dorifer.restartApp() );
                await universe.Identity.useIdentity(SSI);
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
