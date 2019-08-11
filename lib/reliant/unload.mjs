/**
 *
 *
 * @author: blukassen
 */

class Unload {

    add(fn) {
        // for normal browser-windows, we use the beforeunload-event
        window.addEventListener('beforeunload', function () {
            fn();
        }, true);

        // for iframes, we have to use the unload-event
        // @link https://stackoverflow.com/q/47533670/3443137
        window.addEventListener('unload', function () {
            fn();
        }, true);

        // TODO add fallback for safari-mobile
        // @link https://stackoverflow.com/a/26193516/3443137
    }

}

export default new Unload();
