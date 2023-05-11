/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import { BaseDB }            from "/evolux.universe/lib/reliant/basedb.mjs";

let db;

export default class LogSink {

    static async init() {
        db = new BaseDB("thoregondbg", "thoregondbg");
        await db._init();
    }

    static async capture(name, str, logentries) {
        try {
            if (str) {
                await db.set(name, str);
            }
            if (logentries && !logentries.is_empty) {
                // await db.set(`${name}_json`, logentries);
            }
        } catch (e) {
            console.error(e);
        }
    }

}
