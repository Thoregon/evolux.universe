/**
 *
 *
 * @author: blukassen
 */

class Unload {

    add(fn) {
        process.on('exit', function () {
            return fn();
        });

        /**
         * on the following events,
         * the process will not end if there are
         * event-handlers attached,
         * therefore we have to call process.exit()
         */

        process.on('beforeExit', function () {
            return Promise.resolve(fn()).then(function () {
                return process.exit();
            });
        });

        // catches ctrl+c event
        process.on('SIGINT', function () {
            return Promise.resolve(fn()).then(function () {
                return process.exit();
            });
        });
    }

    uncaught(fn) {
        // catches unhandled rejects
        process.on('unhandledRejection', (reason, p) => {
            let event = { error: 'unhandledRejection', message: reason, p };
            return Promise.resolve(fn(event));
        });

        // catches uncaught exceptions
        process.on('uncaughtException', function (err) {
            let event = { error: 'uncaughtException', message: err.stack ? err.stack.toString() : err.message };
            return Promise.resolve(fn(event));
        });
    }

}

export default new Unload();
