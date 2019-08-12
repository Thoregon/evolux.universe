/**
 *
 *
 * @author: blukassen
 */

import fs       from 'fs';
import path     from 'path';

export default class ModuleResolver {

    static findModule(name, location) {
        let modulepath = path.join(location, name);
        if (fs.existsSync(modulepath)) {
            return modulepath;
        }
        let stat = fs.lstatSync(location);
        let found;
        if (stat.isDirectory()) {
            let dircontent = fs.readdirSync(location);
            for (let item of dircontent) {
                let sublocation = path.join(location, item, "node_modules/");
                if (fs.existsSync(sublocation) && fs.lstatSync(sublocation).isDirectory()) {
                    found = this.findModule(name, sublocation);
                }
                if (found) return found;
            }
        }

        return found;
    }

    static findModuleMain(modulepath) {
        let stat = fs.lstatSync(modulepath);
        if (stat.isFile()) {
            return modulepath;
        } else if (stat.isDirectory()) {
            // check if it is a node module
            let packagepath = path.join(modulepath, "package.json");
            if (!fs.existsSync(packagepath)) throw new Error(`Module ${modulepath} is not a 'nodeJS' module`);
            let packagedefinition = JSON.parse(new String(fs.readFileSync(packagepath)));
            // todo: if not "jsnext:main" then check if "type" is "module", otherwise it must be packaged
            let mainpath = path.join(modulepath, (packagedefinition["jsnext:main"]) ? packagedefinition["jsnext:main"] : (packagedefinition.main) ? packagedefinition.main : 'index.js');
            if (fs.existsSync(mainpath)) return { mainpath, ecma: (packagedefinition["jsnext:main"]) ? 'ES6' : 'node' };
            throw Error(`Module ${modulepath} no main script or module found.`);
        } else {
            throw Error(`Module ${modulepath} is of unusable type. Not a file nor a directory.`);
        }
    }

    static resolveModule(name, location) {
        let modulepath = this.findModule(name, location);
        let modulemain = this.findModuleMain(modulepath);
        return modulemain;
    }
}
