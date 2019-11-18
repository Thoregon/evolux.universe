/**
 *
 *
 * @author: blukassen
 */

import fs               from 'fs';
import path             from 'path';
// import rollup           from 'rollup';

const wrapper = `
function isFunction(obj) {
  return !!(obj && obj.constructor && obj.call && obj.apply);
};

const module = { exports: {} };
let exports = module.exports;

function define(p1, p2) {
    module.exports = isFunction(p1) ? p1() : isFunction(p2) ? p2() : {};
}
define.amd = true;

/*******************************************************/
{{modulesource}}
/*******************************************************/

export default module.exports;
`;

export default class ModuleResolver {

    static buildBootScript(script, startscriptname, params) {
        let source = script.replace(/\$\{clientparams\}/, params ? JSON.stringify(params) : '{}');
        return source.replace(/\$\{index\}/, startscriptname);
    }

    static findModule(name, location) {
        let modulepath = path.join(location, name);
        if (fs.existsSync(modulepath)) {
            return modulepath;
        }

        /*
         * if not found directly in the apps 'node_modules'
         * scann sub 'node_modules' if it is located here
         */
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

        throw Error(`Module ${modulepath} not found.`);
    }

    static findModuleMainFile(root, mpath) {
        let modulepath = path.join(root, mpath);
        let moduleref = this.findModuleMain(modulepath);
        // todo: check module type and wrap it, add to cache
        if (moduleref && moduleref.url) return moduleref.url.substr(root.length);
    }

    static findModuleMain(modulepath) {
        let moduleref = { url: '', format: 'none'};

        let stat = fs.lstatSync(modulepath);
        if (stat.isFile()) {
            return modulepath;
        } else if (stat.isDirectory()) {
            /*
             * check if it is a bower module
             */
            let bowerpath = path.join(modulepath, "bower.json");
            if (fs.existsSync(bowerpath)) {
                let bowerdefinition = JSON.parse(new String(fs.readFileSync(bowerpath)));
                if (bowerdefinition.main) {
                    moduleref.format = 'iife';
                    moduleref.url = path.join(modulepath, bowerdefinition.main);
                }
            } else {
                /*
                 * check if it is a node module
                 */
                let packagepath = path.join(modulepath, "package.json");
                if (!fs.existsSync(packagepath)) throw new Error(`Module ${modulepath} is not a 'nodeJS' module`);
                let packagedefinition = JSON.parse(new String(fs.readFileSync(packagepath)));

                // reference to a ES6 module
                if (packagedefinition.type === 'module') {
                    moduleref.format = 'module';
                    moduleref.url = path.join(modulepath, packagedefinition.main);
                // reference to a ES6 module
                } else if (packagedefinition["jsnext:main"] || packagedefinition.type === 'module') {
                    moduleref.format = 'module';
                    moduleref.url = path.join(modulepath, packagedefinition["jsnext:main"]);
                // reference to a browser script
                } else if (packagedefinition.browser && packagedefinition.browser.constructor === String) {
                    moduleref.format = 'iife';
                    moduleref.url = path.join(modulepath,packagedefinition.browser);
                // standard 'commonjs' node module
                } else if (packagedefinition.unpkg && packagedefinition.unpkg.constructor === String) {
                    moduleref.format = 'iife';
                    moduleref.url = path.join(modulepath,packagedefinition.unpkg);
                } else {
                    moduleref.format = 'commonjs';
                    moduleref.url = path.join(modulepath, packagedefinition.main);
                }
            }

            if (fs.existsSync(moduleref.url)) return moduleref;

            throw Error(`Module ${modulepath} no main script or module found.`);
        } else {
            throw Error(`Module ${modulepath} is of unusable type. Not a file nor a directory.`);
        }
    }

    static async resolveModule(name, location, cachelocation) {
        let modulepath = this.findModule(name, location);
        let moduleref = this.findModuleMain(modulepath);
        if (moduleref.format === 'commonjs') {
            if (! await this.wrapES6(name, moduleref, cachelocation)) {
                // todo: check if a bower module exists
                // todo: transpile it for browser use
            }
        }
        if (moduleref.format === 'iife') {
            // wrap with ES6 export
            await this.wrapES6(name, moduleref, cachelocation);
        }
        return moduleref;
    }

    static async wrapES6(name, moduleref, cachelocation) {
        let modulesource = new String(fs.readFileSync(moduleref.url)).toString();
        // check if 'main' uses require(), no wrapping possible
        if (modulesource.indexOf(" require(") > -1) return false;

        modulesource = wrapper.replace(/\{\{modulesource\}\}/, modulesource);
        let newpath = path.join(cachelocation, `${name}.mjs`);
        fs.writeFileSync(newpath, modulesource);

        moduleref.url = newpath;
        return true;
    }
}
