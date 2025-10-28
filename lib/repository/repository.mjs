/**
 * A repository base implementation.
 *
 * @author: Bernhard Lukassen
 */

import EventEmitter from "/evolux.util/lib/eventemitter.mjs";
import { Reporter }     from "/evolux.supervise";

export default class Repository extends Reporter(EventEmitter) {

    constructor() {
        super(...arguments);
        this._items =   new Map();
    }

    has(id) {

    }



    /*
     * EventEmitter implementation
     */


}
