import fs               from 'fs';
import path             from 'path';
import process          from "process";

/**
 * Special handling for EVOLUX & THOREGON
 *
 * @author: blukassen
 */

const thoregonRoot = () => (fs.existsSync('./.thoregonroot')) ? fs.readFileSync('./.thoregonroot').toString().trim() : process.cwd();

// todo: make evolux, thoregon and abishadia modulepath definable

const THOREGONPREFIX    = '/thoregon.';
const EVOLUXPREFIX      = '/evolux.';
const ABISHADIAPREFIX   = '/abishadia.';
// const THOREGON_PREFIXES = ['/tr/', '/T/', '/t͛/', '/T͛/', '/thoregon/'];
let  ROOTPATH           = thoregonRoot();
if (!ROOTPATH.startsWith('/')) ROOTPATH = path.join(process.cwd(), ROOTPATH);
const EVOLUXPATH        = path.join(ROOTPATH, `${EVOLUXPREFIX}modules`);
const THOREGONPATH      = path.join(ROOTPATH, `${THOREGONPREFIX}modules`);
const ABISHADIAPATH     = path.join(ROOTPATH, `${ABISHADIAPREFIX}modules`);

let rootdir;
let cacheroot;

export default class ThoregonLoader {

    constructor({
                    root = './',
                    cachelocation = './.thoregon/jscache',
                } = {}) {
        Object.assign(this, {
            root,
            cachelocation
        });
        rootdir         = path.join(process.cwd(), root);
        cacheroot       = path.join(rootdir, cachelocation);
    }

    ensureCache() {
        let cachepath = cacheroot;
        // todo: make each sub dir! otherwise may throw an error
        if (!fs.existsSync(cachepath)) {
            let cachpath_ = cachepath.startsWith('./') ? cachepath.substr(2) : cachepath;
            let parts = cachepath.split('/');
            let createpath = '';
            while (parts.length > 0) {
                let part = parts.splice(0,1);
                if (part.length === 0 || part[0] === '') continue;
                let elem = part[0];
                createpath += '/' +elem;
                if (!fs.existsSync(createpath)) fs.mkdirSync(createpath);
            }
        }
        return true;
    }

    get thoregonRoot() {
        return ROOTPATH;
    }

    isThoregon(specifier) {
        return specifier.startsWith(EVOLUXPREFIX) || specifier.startsWith(THOREGONPREFIX) || specifier.startsWith(ABISHADIAPREFIX);
    }

    resolveThoregon(specifier, url) {
        if (specifier.startsWith(EVOLUXPREFIX)) return this._resolveThoregon(EVOLUXPATH, '/evolux.modules', url);
        if (specifier.startsWith(THOREGONPREFIX)) return this._resolveThoregon(THOREGONPATH, '/thoregon.modules', url);
        if (specifier.startsWith(ABISHADIAPREFIX)) return this._resolveThoregon(ABISHADIAPATH, '/abishadia.modules', url) ;
        throw new Error(`Unknown Thoregon Module: ${specifier}`);
    }

    _resolveThoregon(root, mainmodule, url) {
        let parts = url.pathname.split('/');
        let tmodule = parts[1];
        if (parts.length < 3) return this._resolveThoregonMain(root, tmodule);
        let subpath = parts.splice(2).join('/');
        return this._resolveToregonModule(root, tmodule, subpath)
    }

    _resolveThoregonMain(root, tmodule) {
        return {
            url: `file://${root}/${tmodule}/index.mjs`,   // todo: check if 'index.mjs' is the main of the module
            format: 'module'
        };
    }

    _resolveToregonModule(root, tmodule, subpath) {
        return {
            url: `file://${root}/${tmodule}/${subpath}`,   // todo: check if 'index.mjs' is the main of the module
            format: 'module'
        };
    }
}

