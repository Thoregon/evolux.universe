/**
 *
 *
 * @author: blukassen
 */

class Unload {

    add(fn) {
        // call fn only once
        let exitfn = fn;
        const _fn = () => {
            let xfn = exitfn;
            exitfn = null;
            return xfn;
        };
        // *********

        process.on('exit', () => {
            let xfn = _fn();
            return xfn ? xfn() : null;
        });

        /**
         * on the following events,
         * the process will not end if there are
         * event-handlers attached,
         * therefore we have to call process.exit()
         */

        process.on('beforeExit', () => {
            let xfn = _fn();
            return xfn
                ? Promise.resolve(fn()).then(() => {
                    return process.exit();
                })
                : Promise.resolve(null);
        });

        // catches ctrl+c event
        process.on('SIGINT', () => {
            let xfn = _fn();
            return xfn
                ? Promise.resolve(fn()).then(() => {
                    return process.exit();
                })
                : Promise.resolve(null);
        });
        process.on('SIGTERM', () => {
            let xfn = _fn();
            return xfn
                   ? Promise.resolve(fn()).then(() => {
                    return process.exit();
                })
                   : Promise.resolve(null);
        });
    }

    uncaught(fn) {
        // catches unhandled rejects
        process.on('unhandledRejection', (reason, p) => {
            let event = { error: 'unhandledRejection', message: reason, p };
            return Promise.resolve(fn(event));
        });

        // catches uncaught exceptions
        process.on('uncaughtException', (err) => {
            let event = { error: 'uncaughtException', message: err.stack ? err.stack.toString() : err.message };
            return Promise.resolve(fn(event));
        });
    }
}

export default new Unload();
