/**
 * get the file mapping defined in /components.mjs
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import process                        from "process";
import path                           from "path";
import { exploreModule, rootMapping } from "./fsutils.mjs";

/**
 * lopps async over a collection
 * @param collection
 * @param fn                async function
 * @return {Promise<void>}
 */
export const forEach = async (collection, fn) => {
    if (!collection || !Array.isArray(collection)) return ;
    for (let index = 0; index < collection.length; index++) {
        await fn(collection[index], index, collection);
    }
};

export default async () => {
    let c = {};
    try {
        let cwd = process.cwd();
        let cd  = (await import(path.join(cwd, 'components.mjs'))).default;

        await forEach(Object.entries(cd), async ([module, root]) => {
            if (!root.startsWith('/')) root = path.normalize(path.join(cwd, root));     // resolve relative directories
            let entries = await exploreModule(root);
            // module = module === 'www' ? module : `/${module}`;
            if (entries) Object.assign(c, { [module]: { fs: root, entries } });
        });
        if (!c.www) {
            let entries = await exploreModule(cwd);
            Object.assign(c, { 'www': { fs: cwd, entries } });
        }
    } catch (ignore) {
        console.log(ignore);
    }
    return c;
}
