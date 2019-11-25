/**
 *
 *
 * @author: blukassen
 */

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
        this.log('debug',... message);
    },
};
