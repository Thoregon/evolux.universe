/**
 *
 *
 * @author: blukassen
 */

const isDebug = () => globalThis.universe && globalThis.universe.DEBUG || false;

export const emsg = (err) => !!err ? err.trace ? `\n${err.trace()}` : err.stack ? `\n${err.stack}` : err.message.stack ? `\n${err.message.stack}` : err.message ? ` --> ${err.message}` : err.toString() : '';

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

export const forEach = async (collection, fn) => {
    for (let index = 0; index < collection.length; index++) {
        await fn(collection[index], index, collection);
    }
};
