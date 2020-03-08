/**
 *
 *
 * @author: blukassen
 */

import fs                       from 'fs';
import path                     from 'path';
import ThoregonLoader           from "../thoregonloader.mjs";
import { bootlogger, forEach }  from "../bootutil.mjs";

const isDirectory = source => fs.existsSync(source) && fs.lstatSync(source).isDirectory();

// todo: get params from universe
const thoregonloader = new ThoregonLoader({ root: './', cachelocation: './.thoregon/jscache'});

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

const componentdirs = ['sovereign', 'reliant', 'headless', 'headed', 'rich', 'lite'];

export default class ModuleResolver {

    static buildBootScript(script, startscriptname, params) {
        let source = script.replace(/\$\{clientparams\}/, params ? JSON.stringify(params) : '{}');
        return source.replace(/\$\{index\}/, startscriptname);
    }

    static buildIndex(script, approot) {
        let ref = !approot ? '' : `<a href="${approot}"><iframe src="${approot}" style="height: 100%; width: 100%"></iframe></a>`;
        return script.replace(/\$\{app\}/, ref);
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
        let found;
        if (isDirectory(location)) {
            let dircontent = fs.readdirSync(location);
            for (let item of dircontent) {
                let sublocation = path.join(location, item, "node_modules/");
                if (isDirectory(sublocation)) {
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
        if (moduleref && moduleref.url) {
            moduleref.href = moduleref.url.substr(root.length);
            return moduleref;
        };
    }

    static findModuleMain(modulepath) {
        let namei = modulepath.lastIndexOf("/");
        let name = (namei > -1) ? modulepath.substr(namei+1): modulepath;

        let moduleref = { name, url: '', format: 'none' };

        let stat = fs.lstatSync(modulepath);
        if (stat.isFile()) {
            moduleref.url = modulepath;
            return moduleref;
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

    static async resolveModuleHref(moduleref, cachelocation, prefixlen) {
        if (moduleref.format === 'commonjs' || moduleref.format === 'iife') {
            if (await this.wrapES6(moduleref.name, moduleref, cachelocation)) {
                if (moduleref.href && prefixlen) {
                    moduleref.href = moduleref.url.substr(prefixlen);
                }
            }
        }
        return moduleref;
    }

    static async wrapES6(name, moduleref, cachelocation) {
        let modulesource = new String(fs.readFileSync(moduleref.url)).toString();
        // check if 'main' uses require(), no wrapping possible
        if (modulesource.indexOf("require(") > -1) return false;
        // if it is ES6, no wrapping needed
        // if (modulesource.indexOf("import") > -1) return true;

        modulesource = wrapper.replace(/\{\{modulesource\}\}/, modulesource);
        let newpath = path.join(cachelocation, `${name}.mjs`);
        fs.writeFileSync(newpath, modulesource);

        moduleref.url = newpath;

        return true;
    }

    /*
     * resolve components
     */

    static async buildComponentsScript(referer, location, cacheroot, mode) {
        let baseurl = path.join(new URL(referer).pathname, '..');
        let root = location, url = '/';

        // todo: resolve ./node_modules
        if (thoregonloader.isThoregonReferer(referer)) {
            let elems = thoregonloader.resolveThoregonComponents(baseurl);
            root = elems.root;
            url  = elems.url;
        } else {
            url = path.join(location, baseurl, 'components');
        }

        let components = await this.analyseComponents(url, root, mode);


        return `export default ${JSON.stringify(components)};`;
    }

    static async analyseComponents(url, root, mode) {
        let reliant = mode.nature && mode.nature === 'reliant';
        let components = {};
        let rootlen = root.length+1;
        if (thoregonloader.isThoregonRef(url)) {
            let elems = thoregonloader.resolveThoregonComponents(thoregonloader.rescopeThoregonUrl(reliant ? url : root));
            root = elems.module ? path.join(elems.root, elems.module) : elems.root;
            url  = elems.url;
            if (!url.endsWith('components')) url = path.join(url, 'components');
            rootlen = root.length;
        }
        if (isDirectory(url)) {
            await this._componentsWithin(components, url, rootlen);
            if (mode.nature) {
                await this._componentsWithin(components, path.join(url, `/${mode.nature}`), rootlen);
                if (mode.density) {
                    await this._componentsWithin(components, path.join(url, `/${mode.nature}/${mode.density}`), rootlen);
                }
            }
        }
        return components;
    }

    static async _componentsWithin(components, url, rootlen) {
        if (!fs.existsSync(url)) return;
        let names = fs.readdirSync(url);

        await forEach(names, async name => {
            // exclude directories which represents a node type
            if (!componentdirs.includes(name) && isDirectory(path.join(url, name))) {
                if (fs.existsSync(path.join(url, name, 'index.mjs'))) components[name] = { id: name, href: `${url.substr(rootlen)}/${name}/index.mjs` };
                if (fs.existsSync(path.join(url, name, 'index.js'))) components[name]  = { id: name, href: `${url.substr(rootlen)}/${name}/index.js` };
                // todo: read other meta information for component
            } else if (name.endsWith('.tcd')) {     // check if there are native thoregon component descriptors
                try {
                    let componentdescriptor = await import(path.join(url, name));
                    if (!componentdescriptor.default) {
                        bootlogger.error(`[ModuleResolver] import component descriptor '${name}`, 'descriptor has no default export');
                    } else {
                        name = componentdescriptor.default.id;
                        if (name) {
                            let { component, ...descriptor} = componentdescriptor.default;
                            descriptor = Object.assign(new componentdescriptor.default.constructor(), descriptor);
                            components[name] = descriptor;
                        } else {
                            bootlogger.error(`[ModuleResolver] import component descriptor '${name}`, 'descriptor has no id');
                        }
                    }
                } catch (e) {
                    bootlogger.error(`[ModuleResolver] import component descriptor '${name}`, e);
                }
            }
        });
    }
}
