/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import fs                         from "fs/promises";
import path                       from "path";
import { exists, ensureDir }      from "/evolux.universe/lib/loader/fsutils.mjs";

export default class LogSink {

    static async init() {
        ensureDir("log/dbg");
    }

    static async capture(name, str, logentries) {
        try {
            const directory = path.resolve(process.cwd(), 'log', 'dbg');
            if (str) {
                await fs.writeFile(path.join(directory, `${name}.txt`), str);
            }
            if (logentries && !logentries.is_empty) {
                const json = JSON.stringify(logentries, undefined, 4);
                await fs.writeFile(path.join(directory,`${name}.json`), json);
            }
        } catch (e) {
            console.error(e);
        }
    }
}
