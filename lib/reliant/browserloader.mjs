import fs               from 'fs';
import path             from 'path';
import setup            from '../setup.mjs';
import express          from '/express';
import cors             from '/cors';
import ModuleResolver   from '../modules/moduleresolver.mjs';
import config           from './config.mjs';
import ThoregonLoader   from "../thoregonloader.mjs";
import { timeout }      from "../thoregonhelper.mjs";
import { Reporter }     from "/evolux.supervise";

/**
 * The script will be loaded from a boot script, which detects the clients properties
 * and helps to build the right loader script.
 * This boot script will be referenced directly in the HTML.
 *
 * ToDo:
 * - websocket for clients to
 *
 * @author: blukassen
 */

// import { EError }  from '/evolux.supervise';

const BOOT_SCRIPT   = 'boot.template.mjs';
const INDEX_DOC     = 'index.template.html';

const app = express();

let thoregonloader;

let stp;            // result of setup()
let cfg;            // result of config(env)
let idx;            // artificial index html for the browser to boot
let boot;           // boot script to be loaded from the browser
let wwwroot;        // content root directory
let commonroot;     // common content root directory, typically the root from the souvereign node
let modroot;        // module root directory --> 'node_modules'
let thoregonroot;   // thoregon/evolux modue root --> 'thoregon.modules' and 'evolux.modules'
let scrroot;        // script root directory --> 'bower_components'
let cacheroot;      // cache root directory

export default class BrowserLoader extends Reporter() {

    constructor({
                    root,
                    index,
                    cachelocation,
                    moduleroot,
                    scriptroot,
                    port
                } = {}) {
        super();
        Object.assign(this, {
            root,
            index,
            cachelocation,
            moduleroot,
            scriptroot,
            port
        });
    }

    // todo: add 'corsWhitelist' and 'cspWhitelist'
    static serve({
                 root = 'www/',
                 common = './',
                 index = 'index.mjs',
                 cachelocation = './.thoregon/jscache',
                 moduleroot = './node_modules',
                 scriptroot = './bower_components',
                 port = 8080
             } = {}) {
        let loader = new this({root, index, cachelocation, moduleroot, scriptroot, port});
        thoregonloader = new ThoregonLoader({ root, cachelocation });

        /*
         * do the basic initialisation
         */
        stp             = setup(root);
        stp.env.wwwroot = root;
        wwwroot         = path.join(process.cwd(), root);
        commonroot      = path.join(process.cwd(), common);
        modroot         = path.join(wwwroot, moduleroot);
        thoregonroot    = thoregonloader.thoregonRoot;
        scrroot         = path.join(wwwroot, scriptroot);
        cacheroot       = path.join(wwwroot, cachelocation);
        //cfg         = config(env);

        loader.setupBrowserTemplates();

        loader.setupExpress(port);

        return loader;
    }

    /**
     * get templates for browser startup
     */
    setupBrowserTemplates() {
        let templatepath    = path.join(thoregonroot, 'evolux.modules/evolux.universe/lib/reliant/templates');
        boot                = new String(fs.readFileSync(path.join(templatepath, BOOT_SCRIPT))).toString();
        idx                 = new String(fs.readFileSync(path.join(templatepath, INDEX_DOC))).toString();
    }

    /**
     * setup the HTTP service
     * ToDo: add WS (websockets)
     */
    setupExpress(port) {
        app.use(cors({
            exposedHeaders: ['Content-Length'],
            credentials: true,
            origin: function(origin, callback){
/*
                // allow requests with no origin
                if(!origin) return callback(null, true);

                // todo: enable restriction of origin
                if(allowedOrigins.indexOf(origin) === -1){
                    var msg = `The CORS policy for this site does not allow access from origin ${origin}.`;
                    return callback(new Error(msg), false);
                }
*/
                return callback(null, true);
            }
        }));
        app.use((req, res, next) => this.http(req, res, next));
        app.use(express.static(wwwroot));

        // cache for built modules must exists
        thoregonloader.ensureCache();

        // now start the service
        app.listen(port);
    }

    get app() {
        return app;
    }

    http(req, res, next) {
        let fpath;
        let url     = req.originalUrl;
        let referer = req.header("referer");
        // let etag    = req.headers['if-none-match'];
        this.logger.debug('URL', url);
        if (url === '/' || url === `/index.html`)       return this.sendIndex(req, res);
        if (url === 'busyrequest')                      return this.sendDone(req, res);
        if (url.match(/universe\..*\.mjs/))             return this.sendConfig(url, req, res);
        if (url.startsWith('/universe'))                return this.sendUniverse(url, req, res);
        if (url.startsWith('/boot'))                    return this.sendBoot(req, res);
        if (thoregonloader.isThoregonBase(url))         return this.sendThoregonFile(url, req, res);
        if (thoregonloader.isThoregon(url))             return this.redirectThoregon(url, req, res);
        fpath = thoregonloader.resolveSubModule(referer, url);
        if (!!fpath)                                    return this.redirectThoregonSubModule(fpath, req, res);

        if (this.isModuleFile(url, modroot))            return this.sendModuleFile(url, modroot), req, res;
        if (this.isModuleFile(url, wwwroot))            return this.sendModuleFile(url, wwwroot, req, res);
        if (this.isModuleFile(url, commonroot))         return this.sendModuleFile(url, commonroot, req, res);

        // todo: check for 'nodejs' modules in node_modules, get "main", transpile
        // todo: resolve and redirect local modules
        if (this.isNodeModule(url))                     return this.sendModule(url, req, res, modroot);
        if (this.isModule(url))                         return this.sendModule(url, req, res, wwwroot);
        if (this.isCommonModule(url))                   return this.sendModule(url, req, res, commonroot);

        let result = next();
    }

    /**
     * creates a script containing all config scripts as import.
     * also establishes a worker to reload content if updated
     * returns the universe
     *
     * @param url
     * @param req
     * @param res
     * @return universe
     */
    redirectThoregon(url, req, res) {
        let filename;
        // todo: use ThoregonLoader
        if (url === '/evolux.universe/config.mjs') {
            if (!cfg) {
                cfg = config(stp.env);
            }
            res.type('.mjs');
            this._setModuleContentType(res);
            res.send(cfg);
        } else if (url === '/evolux.universe/@webcomponents') {
            filename = path.join(thoregonroot, 'evolux.universe/node_modules/@webcomponents/webcomponentsjs/webcomponents-bundle.js');
            this._setModuleContentType(res);
            res.sendFile(filename);
/*
        } else if (url === '/evolux.universe/index.mjs' || url === '/evolux.universe') {
            filename = path.join(thoregonroot, thoregonloader.evoluxmodules, 'evolux.universe/index.reliant.mjs');
            this._setModuleContentType(res);
            res.sendFile(filename);
*/
        } else {
            let modurl = url;
            if (url === '/evolux.universe') {
                modurl += '/index.reliant.mjs';
            } else if (url.lastIndexOf('/') < 1) {
                // todo: check if a 'index.reliant.mjs' exists
                let reliantidx = modurl + '/index.reliant.mjs';
                if (thoregonloader.resolveThoregonSubFile(reliantidx)) {
                    modurl = reliantidx;
                } else {
                    modurl += '/index.mjs';     // todo: check if exists
                }
            }
            modurl = thoregonloader.redirectModuleUrl(modurl);
            res.redirect(302, modurl);         // todo: change to 301 after testing
/*
            let filename = thoregonloader.resolveUrl(url);
            if (fs.existsSync(filename)) {
                this._setModuleContentType(res);
                res.sendFile(filename);
            } else {
                res.status(404).send(`${url} not found`);
            }
*/
        }
    }

    async redirectThoregonSubModule(fpath, req, res) {
        let moduleref = ModuleResolver.findModuleMainFile(thoregonloader.thoregonRoot, fpath);
        moduleref = await ModuleResolver.resolveModuleHref(moduleref, cacheroot, wwwroot.length);
        let modulepath = moduleref.href;

        res.redirect(302, modulepath);         // todo: change to 301 after testing
    }

    sendThoregonFile(url, req, res) {
        let filename = thoregonloader.resolveThoregonFile(url);
        if (filename) {
            this._setModuleContentType(res);
            res.sendFile(filename);
        } else {
            res.status(404).send(`${url} not found`);
        }
    }

    isNodeModule(url) {
        return url !== '/' && url.startsWith("/") && fs.existsSync(path.join(modroot, url.substr(1)));
    }

    isModule(url) {
        return url !== '/' && url.startsWith("/") && fs.existsSync(path.join(wwwroot, url.substr(1)));
    }

    isCommonModule(url) {
        return url !== '/' && url.startsWith("/") && fs.existsSync(path.join(commonroot, url.substr(1)));
    }

    /**
     * send a node module packaged for the browser
     *
     * @param url
     * @param req
     * @param res
     */
    async sendModule(url, req, res, rootpath) {
        // todo: check referer for base module: req.header('Referer')
        try {
            let modulename = url.substr(1);
            let bundlefilepath = await this.checkCache(url);
            if (!bundlefilepath) {
                let module = await ModuleResolver.resolveModule(modulename, rootpath, cacheroot);
                // todo: build ES6 if 'node'
                bundlefilepath = module.url;
            }
            // todo: redirect!!
            // res.sendFile(bundlefilepath);
            res.redirect(302, bundlefilepath.substring(rootpath.length-1));
        } catch (e) {
            res.status(404).send(`${url} not found`);
        }
    }

    isModuleFile(url,rootpath ) {
        let filepath = path.join(rootpath, url.substr(1));
        return fs.existsSync(filepath) && fs.lstatSync(path.join(rootpath, url.substr(1))).isFile();
    }

    async sendModuleFile(url, rootpath, req, res) {
        res.sendFile(path.join(rootpath, url.substr(1)));
    }

    isThoregonModule(specifier) {
        return thoregon.isThoregon(specifier);
    }

    async checkCache(url) {
        return null;
    }

    analyseModule(modulename) {
        if (!fs.existsSync(path.join(process.cwd(), this.root, filepath))) throw EError();
    }

    async build(url, modulename) {
        let modulepath = path.join(process.cwd(), url);

        const inputOptions = {
            input: modulepath,
        };

        const bundlefilepath = path.join(this.cachelocation, `bundle_${modulename}.js`);
        const outputOptions = {
            output: {
                name: modulename,
                file: bundlefilepath,
                format: 'iife'
            }
        };

        // create a bundle
        const bundle = await rollup.rollup(inputOptions);

        // console.log(bundle.watchFiles); // an array of file names this bundle depends on

        // generate code
        const {output} = await bundle.generate(outputOptions);

        // or write the bundle to disk
        await bundle.write(outputOptions);

        return bundlefilepath;
    }

    isIndexRequest(url) {
        return url.startsWith('/');
    }

    sendIndex(req, res) {
        // todo: when added CSP, do the replacements in the source
        if (!res.getHeader('content-type')) res.setHeader('Content-Type', "text/html; charset=UTF-8");
        res.send(idx, req, res);
    }

    sendConfig(url, req, res) {
        let modurl = path.join(process.cwd(), this.root, url);
        if (fs.existsSync(modurl)) {
            res.set('Cache-Control', 'public, max-age=86400');
            res.sendFile(modurl);
        } else {
            // don't send an error, just send an empty file;
            if (!res.getHeader('content-type')) res.setHeader('Content-Type', "application/javascript; charset=UTF-8");
            res.send('');
        }
    }

    sendBoot(req, res) {
        let params = this.useParams(req, res);
        if (!params.nature)  params.nature = 'reliant';
        if (!params.density) params.density = (req.headers.host.startsWith('localhost') || req.headers.host.startsWith('127.0.0.1')  || req.headers.host.startsWith('::1')) ? 'lite' : 'rich';
        if (!res.getHeader('content-type')) res.setHeader('Content-Type', "application/javascript; charset=UTF-8");
        res.send(ModuleResolver.buildBootScript(boot, this.index, params), req, res);
    }

    // todo: - there may also be timing problems, when this script is cached, but new entries are made
    //         --> need a service worker for reloading
    sendUniverse(url, req, res) {
        if (url.startsWith('/')) url = url.substring(1);
        if (url.endsWith('/')) url = url.substring(0, url.length-2);
        let from = url.replace(/\//g, '.');
        let parts = from.split('.');

        let mexports = global;
        for (let part of parts) {
            mexports = mexports[part];
        }
        let names = Object.keys(mexports).filter(item => !item.startsWith('_'));

        let _exports = '';
        names.forEach(name => _exports += `\nexport const ${name} = ${from}.${name};`);

        let script =
`
 /*
  * dynamic created import
  */ 
${_exports}
const _exports = ${from};
export default _exports;
`;
        if (!res.getHeader('content-type')) res.setHeader('Content-Type', "application/javascript; charset=UTF-8");
        res.send(script);
    }

    useParams(req, res) {
        return req.query;
    }

    sendFile(filepath, req, res) {
        res.set('Cache-Control', 'public, max-age=86400');
        res.sendFile(path.join(process.cwd(), this.root, filepath));
    }

    sendFileResolved(filepath, req, res) {
        res.set('Cache-Control', 'public, max-age=86400');
        res.sendFile(filepath);
    }

    existsStatic(filepath) {
        return fs.existsSync(path.join(process.cwd(), this.root, filepath));
    }

    async sendDone(req, res) {
        await timeout(10000);
        res.send('');
    }

    _setModuleContentType(res) {
        if (!res.getHeader('content-type')) res.setHeader('Content-Type', "application/javascript; charset=UTF-8");
    }
}
