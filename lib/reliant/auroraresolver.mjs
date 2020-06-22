/**
 * This loads thoregon.aurora templates as
 *
 * @author: Bernhard Lukassen
 */

import fs                       from '/fs';
import path                     from '/path';

import { forEach }              from '/evolux.util';

const isDirectory = source => fs.existsSync(source) && fs.statSync(source).isDirectory();


const materialdir = 'materials';


export default class AuroraResolver {

    static async findTemplates(thoregonroot) {
        let materialsroot = path.join(thoregonroot, 'thoregon.modules/thoregon.aurora/materials');
        if (!isDirectory(materialsroot)) return '// no aurora templates found';
        let materialtemplates = {};
        let materials = fs.readdirSync(materialsroot);

        // read all templates in the subdirectories
        await forEach(materials, async (name) => {
            let materialroot = path.join(materialsroot, name);
            let templates = fs.readdirSync(materialroot);
            let templatemap = {};
            materialtemplates[name] = templatemap;
            await forEach(templates, (template) => {
                let templatepath = path.join(materialroot, template);
                if (template.endsWith('.jst')) {
                    let templatecontent = new String(fs.readFileSync(templatepath));
                    let templatename = template.slice(0,-4);    // cut off extension
                    templatemap[templatename] = `'${templatecontent}'`;
                }
            });
        });

        return materialtemplates;
    }

}
