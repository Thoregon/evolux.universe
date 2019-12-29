/**
 *
 *
 * @author: blukassen
 */

const isDebug = () => global.universe && global.universe.DEBUG || false;

import { emsg }         from "/evolux.supervise";

export const bootlogger = {
    log(level, ...message) {
        // todo: print timestamp formated
        console.log(level, ':', ...message);
    },

    info(...message) {
        this.log('info', ...message);
    },

    warn(...message) {
        this.log('warn', ...message);
    },

    error(note, err, ...message) {
        let str = (err) ? `${note}: ${emsg(err)}`: note;
        this.log('error', str, ...message);
    },

    debug(...message) {
        if (isDebug()) this.log('debug',... message);
    },
};
