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
        }); // catches ctrl+c event

        process.on('SIGINT', function () {
            return Promise.resolve(fn()).then(function () {
                return process.exit();
            });
        }); // catches uncaught exceptions

        process.on('uncaughtException', function (err) {
            return Promise.resolve(fn()).then(function () {
                console.trace(err);
                process.exit(1);
            });
        });
    }

}

export default new Unload();
