/**
 * This loads thoregon.aurora templates as
 *
 * @author: Bernhard Lukassen
 */

import fs                       from '/fs';
import path                     from '/path';

import { forEach }              from '/evolux.util';

const isDirectory = source => fs.existsSync(source) && fs.statSync(source).isDirectory();


const themesdir = 'themes';


export default class AuroraResolver {

    static async findTemplates(thoregonroot) {
        let themesroot = path.join(thoregonroot, 'thoregon.modules/thoregon.aurora/themes');
        return this.buildTemplates(themesroot, {});
    }

    static async buildTemplates(dir, themestemplates) {
        if (!isDirectory(dir)) return themestemplates;

        let items = fs.readdirSync(dir);
        // read all templates in the subdirectories
        await forEach(items, async (item) => {
            let itempath = path.join(dir, item);
            if (item.endsWith('.jst')) {
                let templatecontent = new String(fs.readFileSync(itempath));
                let templatename = item.slice(0,-4);    // cut off extension
                themestemplates[templatename] = templatecontent;
            } else if (item.endsWith('.css')) {
                let templatecontent = new String(fs.readFileSync(itempath));
                let templatename = `$${item.slice(0,-4)}`;    // cut off extension and start with '$'
                themestemplates[templatename] = templatecontent;
            } else if (item.endsWith('.mjs')) {
                let i = itempath.indexOf('/thoregon.aurora');
                themestemplates[item] = itempath.substr(i);
            } else if (isDirectory(itempath)) {
                let subtpl = {};
                themestemplates[item] = subtpl;
                this.buildTemplates(itempath, subtpl);
            }
        });

        return themestemplates;
    }

}
