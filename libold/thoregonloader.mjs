import fs               from 'fs';
import path             from 'path';
import process          from "process";

/**
 * Special handling for EVOLUX & THOREGON
 *
 * @author: blukassen
 */

const thoregonRoot = () => (process.env.THOREGON_ROOT ? process.env.THOREGON_ROOT : fs.existsSync('./.thoregonroot')) ? fs.readFileSync('./.thoregonroot').toString().trim() : process.cwd();

// todo: make evolux, thoregon and abishadia modulepath definable

const THOREGONPREFIX    = '/thoregon.';
const EVOLUXPREFIX      = '/evolux.';
const TERRAPREFIX       = '/terra.';

const THOREGONBASE      = `${THOREGONPREFIX}modules`;
const EVOLUXBASE        = `${EVOLUXPREFIX}modules`;
const TERRABASE         = `${TERRAPREFIX}modules`;

const THOREGONMODULE    = THOREGONBASE.substr(1);
const EVOLUXMODULE      = EVOLUXBASE.substr(1);
const TERRAMODULE       = TERRABASE.substr(1);

// const THOREGON_PREFIXES = ['/tr/', '/T/', '/t͛/', '/T͛/', '/thoregon/'];
let  ROOTPATH           = thoregonRoot();
if (!ROOTPATH.startsWith('/')) ROOTPATH = path.join(process.cwd(), ROOTPATH);
const EVOLUXPATH        = path.join(ROOTPATH, EVOLUXBASE);
const THOREGONPATH      = path.join(ROOTPATH, THOREGONBASE);
const TERRAPATH         = path.join(ROOTPATH, TERRABASE);

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

    isThoregonBase(specifier) {
        return specifier.startsWith(EVOLUXBASE) || specifier.startsWith(THOREGONBASE) || specifier.startsWith(TERRABASE);
    }

    isThoregon(specifier) {
        return specifier.startsWith(EVOLUXPREFIX) || specifier.startsWith(THOREGONPREFIX) || specifier.startsWith(TERRAPREFIX);
    }

    isThoregonRef(specifier) {
        return specifier.indexOf(EVOLUXPREFIX) > -1 || specifier.indexOf(THOREGONPREFIX) > -1 || specifier.indexOf(TERRAPREFIX) > -1;
    }

    redirectModuleUrl(url) {
        let baseurl = url.startsWith(EVOLUXPREFIX)
            ? '/evolux.modules'
            : url.startsWith(THOREGONPREFIX)
                ? '/thoregon.modules'
                : '/terra.modules';
        url = baseurl + url;
        return url;
    }

    resolveSubModule(referer, url) {
        if (!url.startsWith('/')) return;
        try {
            let pathname = new URL(referer).pathname;
            let parts = pathname.split('/');
            if (parts.length >= 2 && (parts[1].startsWith(EVOLUXMODULE) || parts[1].startsWith(THOREGONMODULE) || parts[1].startsWith(TERRAMODULE))) {
                return this._resolveSubModule(parts[1], parts[2], url);
            }
        } catch (ignore) {}
    }

    resolveComponents(url) {
        url = path.join(ROOTPATH, url, 'components');
        return { root: ROOTPATH, url };
    }

    rescopeThoregonUrl(url) {
        let i = url.lastIndexOf(EVOLUXBASE);
        let len = i + EVOLUXBASE.length;
        if (i < 0) {
            i = url.lastIndexOf(THOREGONBASE);
            len = i + THOREGONBASE.length;
        }
        if (i < 0) {
            i = url.lastIndexOf(TERRABASE);
            len = i + TERRABASE.length;
        }
        return (i < 0) ? url : url.substring(len);
    }

    resolveThoregonComponents(url) {
        let module = url.startsWith(EVOLUXPREFIX)
                    ? EVOLUXBASE
            : url.startsWith(THOREGONPREFIX)
                ? THOREGONBASE
                :url.startsWith(TERRAPREFIX)
                    ? TERRABASE
                    : './';
        url = path.join(ROOTPATH, module, url, url.endsWith('') ? '' : 'components');
        return { root: ROOTPATH.endsWith('/') ? ROOTPATH.substring(0, ROOTPATH.length-1) : ROOTPATH, url, module };
    }

    _resolveSubModule(base, module, url) {
        let modpath = path.join(ROOTPATH, base, module, 'node_modules', url);
        if (fs.existsSync(modpath)) return path.join(base, module, 'node_modules', url);
    }

    isThoregonReferer(referer) {
        try {
            let pathname = new URL(referer).pathname;
            return pathname.startsWith(EVOLUXPREFIX) || pathname.startsWith(THOREGONPREFIX) || pathname.startsWith(TERRAPREFIX);
        } catch (e) {
            return false;
        }
    }

    resolveThoregonSubFile(url) {
        let pathname;

        if (url.startsWith(EVOLUXPREFIX)) pathname = path.join(ROOTPATH, '/evolux.modules', url);
        if (url.startsWith(THOREGONPREFIX)) pathname = path.join(ROOTPATH, '/thoregon.modules', url);
        if (url.startsWith(TERRAPREFIX)) pathname = path.join(ROOTPATH, '/terra.modules', url);

        if (fs.existsSync(pathname)) return pathname;

        return undefined;
    }

    resolveThoregonFile(url) {
        let pathname;

        pathname = path.join(ROOTPATH, url);
        if (fs.existsSync(pathname)) return pathname;

        return undefined;
    }

    resolveThoregon(specifier, url) {
        if (specifier.startsWith(EVOLUXPREFIX)) return this._resolveThoregon(EVOLUXPATH, '/evolux.modules', url);
        if (specifier.startsWith(THOREGONPREFIX)) return this._resolveThoregon(THOREGONPATH, '/thoregon.modules', url);
        if (specifier.startsWith(TERRAPREFIX)) return this._resolveThoregon(TERRAPATH, '/terra.modules', url) ;
        throw new Error(`Unknown Thoregon Module: ${specifier}`);
    }

    resolveUrl(url) {
        if (url.startsWith(EVOLUXPREFIX)) return path.join(EVOLUXPATH, url);
        if (url.startsWith(THOREGONPREFIX)) return path.join(THOREGONPATH, url);
        if (url.startsWith(TERRAPREFIX)) return path.join(TERRAPATH, url) ;
        throw new Error(`Unknown Thoregon Module: ${url}`);
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
            url: `file://${root}/${tmodule}/${subpath}`,
            format: 'module'
        };
    }
}

