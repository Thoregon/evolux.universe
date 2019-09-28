/**
 *
 *
 * @author: blukassen
 */

class Unload {

    add(fn) {
        // for normal browser-windows, we use the beforeunload-event
        window.addEventListener('beforeunload', function () {
            try {
                fn();
            } catch (e) {
                console.trace(e);
            }
        }, true);

        // for iframes, we have to use the unload-event
        // @link https://stackoverflow.com/q/47533670/3443137
        window.addEventListener('unload', function () {
            try {
                fn();
            } catch (e) {
                console.trace(e);
            }
        }, true);

        // TODO add fallback for safari-mobile
        // @link https://stackoverflow.com/a/26193516/3443137
    }

    uncaught(fn) {
        // catches uncaught exceptions
        window.addEventListener('error', function (evt) {
            try {
                let event = { error: 'uncaughtException', message: `${evt.message} (${evt.filename}:${evt.lineno}:${evt.colno})` };
                fn();
            } catch (e) {
                console.trace(e);
            }
        });
    }

}

export default new Unload();
