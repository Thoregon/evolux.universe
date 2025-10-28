/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import fs                         from "fs";
import path                       from "path";

export default class LogSink {

    static async init() {
        fs.mkdirSync("log/dbg", { recursive: true });
    }

    static async capture(name, str, logentries) {
        try {
            const directory = path.resolve(process.cwd(), 'log', 'dbg');
            if (str) {
                fs.writeFileSync(path.join(directory, `${name}.txt`), str);
            }
            if (logentries && !logentries.is_empty) {
                const json = JSON.stringify(logentries, undefined, 4);
                fs.writeFileSync(path.join(directory,`${name}.json`), json);
            }
        } catch (e) {
            console.error(e);
        }
    }

    static async getlog(name) {
        const directory = path.resolve(process.cwd(), 'log', 'dbg');
        const log = fs.readFileSync(path.join(directory,name));
        return log;
    }

}
