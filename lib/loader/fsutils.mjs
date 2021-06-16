/**
 *  filesystem utils
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import fs          from 'fs';
import path        from "path";
import { forEach } from "./bootutils.mjs";

let fsstat = (path) => { try { return fs.statSync(path) } catch (e) {} };
export const isDirectory = (path) => {
    let stat = fsstat(path);
    return stat ? stat.isDirectory() : false
};
export const isFile = (path) => {
    let stat = fsstat(path);
    return stat ? stat.isFile() : false
};
export const fsinclude = (path) => {
    let stat = fsstat(path);
    return stat ? stat.isFile() || stat.isDirectory() : false
};

const exclude = ['.git', 'node_modules', '.DS_Store'];

const include = (entry, prefix) => !exclude.includes(entry) && (!prefix || entry.startsWith(prefix));

export const exploreModule = (dir, prefix) => {
    if (!isDirectory(dir)) return;
    let modules = {};
    let entries = fs.readdirSync(dir);
    entries.forEach((entry) => {
        const entrypath = path.join(dir, entry);
        if (include(entry, prefix) && fsinclude(entrypath)) modules[entry] = exploreModule(entrypath);
    });

    return modules;
}

export const rootMapping = (roots, fsroot) => {
    let mapping = {};
    Object.entries(roots).forEach(([name, entries]) => {
        mapping[name] = { fs: fsroot/* path.join(fsroot, name) */, entries };
    })
    return mapping;
}
