/**
 * this config runs at the service side an assembles a script which imports all config scripts
 * and collects the exports to register it in the universe
 *
 * @author: blukassen
 */

import path from 'path';

export default function (env) {
    let wwwroot = path.join(env.basedir, env.wwwroot);
    let basedirlength = wwwroot.length;
    let cfgfiles = env.universeFiles;
    let refs = [];
    cfgfiles.forEach(fname => refs.push('/' + fname.substr(basedirlength)));
    const script = `
const config = async (env) => {
    env.stage = '${env.stage}';
    let logger = env.logger;
    let exports = {};
    logger.debug("$$ config: start");
    
    // run the config; if it produces errors --> exit
    try {
        for (let cfgfile of ["${refs.join('","')}"]) {
            exports[cfgfile.substr(1)]  = await import(cfgfile);
        }
        logger.debug("$$ config: end");

        return exports;
    } catch (e) {
        logger.error("$$ config: error -> %s", e);
        // process.exit(1); 
    }
    
    return exports;
}

export default config;
`;

    return script;
};
