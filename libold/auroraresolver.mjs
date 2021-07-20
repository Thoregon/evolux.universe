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
        // todo [REFACTOR]: find components in subdirectories
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
                if (i === -1) i = itempath.indexOf('/components');
                themestemplates[item] = i > -1 ? itempath.substr(i) : itempath;
            } else if (isDirectory(itempath)) {
                let subtpl = {};
                themestemplates[item] = subtpl;
                await this.buildTemplates(itempath, subtpl);
            }
        });

        return themestemplates;
    }

    static async buildUIComponents(dir, components) {
        if (!isDirectory(dir)) return components;

        let items = fs.readdirSync(dir);
        // read all templates in the subdirectories
        // todo [REFACTOR]: find components in subdirectories
        await forEach(items, async (item) => {
            let itempath = path.join(dir, item);
            if (item.endsWith('.jst')) {
                let templatecontent     = new String(fs.readFileSync(itempath));
                let templatename        = item.slice(0, -4);    // cut off extension
                components[templatename] = templatecontent;
/*
                let component = this.getComponentEntry(templatename, components);
                component.template = templatecontent;
*/
            } else if (item.endsWith('.css')) {
                let stylecontent      = new String(fs.readFileSync(itempath));
                let styleename        = `$${item.slice(0, -4)}`;    // cut off extension and start with '$'
                components[styleename] = stylecontent;
/*
                let component = this.getComponentEntry(styleename, components);
                component.style = stylecontent;
*/
            } else if (item.endsWith('.mjs')) {
                let i = itempath.indexOf('/components');
                let modulename = item.slice(0, -4);
                let modulepath = itempath.substr(i);
                components[item] = i > -1 ? itempath.substr(i) : itempath;
/*
                let component = this.getComponentEntry(modulename, components);
                component.behavior = modulepath;
*/
            } else if (isDirectory(itempath)) {
                let subtpl = {};
                components[item] = subtpl;
                await this.buildUIComponents(itempath, subtpl);
            }
        });
        return components;
    }

    static getComponentEntry(name, components) {
        let component = components[name];
        if (!component) {
            component = {};
            components[name] = component;
        }
        return component;
    }
}
