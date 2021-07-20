/**
 * This is a simple wrapper to a file based localstore (node-localstore)
 * interface made async
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import { isPrimitive } from "../../../evolux.util";

class BaseDB {

    async get(key) {
        const value = localStorage.getItem(key);
        return value != undefined ? JSON.parse(value) : value;
    }

    async set(key, value) {
        if (value != undefined) localStorage.setItem(key, JSON.stringify(value));
    }

    async del(key) {
        localStorage.removeItem(key);
    }

}

if (!global.baseDB) global.baseDB = new BaseDB();
export default global.baseDB;
