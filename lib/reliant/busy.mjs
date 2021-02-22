/**
 * turn on busy spinner on the browser tab
 *
 * todo:
 * - replace with network indicator on mobile devices
 *      iOS: https://stackoverflow.com/questions/10299889/how-to-turn-on-the-network-indicator-in-the-ios-status-bar
 *      Android: https://beebom.com/how-show-network-activity-status-bar-android/
 * - check if it should be replaced with the browsers loading indicator
 *      https://stackoverflow.com/questions/39269407/how-to-manually-show-tab-loading-indicator-via-javascript
 *
 * @author: Bernhard Lukassen
 */

import { busy as regBusy, isBusy, ready as regReady} from '../busy.mjs';
export { busySince, isBusy }                         from '../busy.mjs';

// import busyspinner                                   from './utils/busyspinner.mjs';

// busyspinner.init();

export const busy = (topic) => {
    // regBusy(topic);
    // busyspinner.start();
}

export const ready = (topic) => {
    // let busytime = regReady(topic);
    // if (!isBusy()) busyspinner.stop();
}
