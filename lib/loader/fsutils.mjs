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
export const exists = (path) => {
    return !!fsstat(path);
}
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

export const ensureDir = (dir, withFile = false) => {
    const sep = path.sep;
    // todo: make each sub dir! otherwise may throw an error
    if (!fs.existsSync(dir)) {
        let dirpath = dir.startsWith(`.${sep}`) ? dir.substr(sep.length+1) : dir;
        let parts = dirpath.split('/');
        if (withFile) parts.pop();
        let createpath = process.cwd();
        while (parts.length > 0) {
            let part = parts.splice(0,1);
            if (part.length === 0 || part[0] === '') continue;
            let elem = part[0];
            createpath += '/' +elem;
            if (!fs.existsSync(createpath)) fs.mkdirSync(createpath);
        }
    }
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
