/**
 * turn on busy spinner on the browser tab
 *
 * todo:
 * - replace with network indicator on mobile devices
 *
 * @author: Bernhard Lukassen
 */

import { busy as regBusy, isBusy, ready as regReady} from '../busy.mjs';
export { busySince, isBusy }                         from '../busy.mjs';

import busyspinner                                   from './utils/busyspinner.mjs';

busyspinner.init();

export const busy = (topic) => {
    regBusy(topic);
    busyspinner.start();
}

export const ready = (topic) => {
    let busytime = regReady(topic);
    if (!isBusy()) busyspinner.stop();
}
