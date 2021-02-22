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

import fs                       from 'fs';
import path                     from 'path';
import setup                    from '../setup.mjs';
import express                  from '/express';
import greenlock                from '/greenlock-express';
import cors                     from '/cors';
import ModuleResolver           from '../modules/moduleresolver.mjs';
import config                   from './config.mjs';
import ThoregonLoader           from "../thoregonloader.mjs";
import { timeout }              from "../thoregonhelper.mjs";
import { Reporter }             from "/evolux.supervise";
import AuroraResolver           from "./auroraresolver.mjs";

// import { EError }  from '/evolux.supervise';

const BOOT_SCRIPT           = 'boot.template.mjs';
const INDEX_DOC             = 'index.template.html';

const SERVICEWORKERLOCATION = './evolux.modules/evolux.universe/lib/reliant/templates/universe-service.mjs';

const service = express();

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
let innerhtml;      // may be used to inject a html as an 'iframe'

export default class BrowserLoader extends Reporter() {

    constructor({
                    root,
                    index,
                    embedded,
                    cachelocation,
                    moduleroot,
                    scriptroot,
                    port
                } = {}) {
        super();
        Object.assign(this, {
            root,
            index,
            embedded,
            cachelocation,
            moduleroot,
            scriptroot,
            port
        });

        this.plugins = [];      // a registry for plugins
    }

    // todo: add 'corsWhitelist' and 'cspWhitelist'
    static serve({
                 root = 'www/',
                 common = './',
                 index = 'index.mjs',
                 embedded = 'thoregonembedded.mjs',
                 cachelocation = './.thoregon/jscache',
                 moduleroot = './node_modules',
                 scriptroot = './bower_components',
                 port = 8080,
                 greenlock
             } = {}) {
        let loader = new this({root, index, embedded, cachelocation, moduleroot, scriptroot, port});
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

        loader.setupExpress(port, greenlock);

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
    setupExpress(port, greenlockcfg) {
        service.use(cors({
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
        service.use((req, res, next) => this.http(req, res, next));
        service.use(express.static(wwwroot));

        // cache for built modules must exists
        thoregonloader.ensureCache();

        if (greenlockcfg) {
            let wrapper = greenlock.init(greenlockcfg)
            wrapper.serve(service);
            universe.wwwservice = service;
            // universe.wwwservice = wrapper;
        } else {
            universe.wwwservice = service;
            // now start the service
            service.listen(port);
        }
    }

    get app() {
        return service;
    }

    // todo [OPEN]: refactor, build a better redirect structure to handle more requests with the same logic
    // todo [OPEN]: first the service worker need to be installed. provide two direct sub urls: 1) serviceworker setup 2) serviceworker script
    http(req, res, next) {
        let fpath;
        let url     = req.originalUrl;
        let referer = req.header("referer");
        if (!res.getHeader('Referrer-Policy')) res.setHeader('Referrer-Policy', "same-origin");
        // if (!res.getHeader('Access-Control-Allow-Origin')) res.setHeader('Access-Control-Allow-Origin', "*");
        // let etag    = req.headers['if-none-match'];
        this.logger.debug('URL', url);

        // if (url === '/' || url === `/index.html`) return this.sendIndex(req, res);
        if (url === '/' || url === `/thoregon.html` || url.startsWith('/?app=')) return this.sendThoregon(req, res);

        if (url === '/thoregonloader-setup')            return this.sendThoregonLoaderSetup(req, res);
        if (url === '/thoregonloader')                  return this.sendThoregonLoader(req, res);
        if (url === 'busyrequest')                      return this.sendDone(req, res);
        if (url === '/universe-service.mjs')            return this.sendUniverseServiceWorker(url, req, res);
        if (url === '/vapidPublicKey')                  return this.sendVapidPublicKey(req,res);                // todo: move to a browserloader plugin/middleware
        if (url.indexOf('/@components') > -1)           return this.sendComponents(req,res, referer);
        if (url.match(/universe\..*\.mjs/))             return this.sendConfig(url, req, res);
        if (url.startsWith('/universe'))                return this.sendUniverse(url, req, res);
        if (url.startsWith('/boot'))                    return this.sendBoot(req, res);
        if (url.startsWith('/embedded'))                return this.sendEmbedded(req, res);
        if (url.startsWith('/@auroratemplates'))        return this.sendUITemplates(thoregonroot, req, res);
        if (url.startsWith('/@ui'))                     return this.sendModuleUI(thoregonroot, referer, req, res);
        if (thoregonloader.isThoregonBase(url))         return this.sendThoregonFile(url, req, res);
        if (thoregonloader.isThoregon(url))             return this.redirectThoregon(url, req, res);
        fpath = thoregonloader.resolveSubModule(referer, url);
        if (!!fpath)                                    return this.redirectThoregonSubModule(fpath, req, res);

        if (this.isNodeModule(url))                     return this.sendModule(url, req, res, modroot);

        if (this.isModuleFile(url, modroot))            return this.sendModuleFile(url, modroot), req, res;
        if (this.isModuleFile(url, wwwroot))            return this.sendModuleFile(url, wwwroot, req, res);
        if (this.isModuleFile(url, commonroot))         return this.sendModuleFile(url, commonroot, req, res);

        // todo: check for 'nodejs' modules in node_modules, get "main", transpile
        // todo: resolve and redirect local modules
        if (this.isModule(url))                         return this.redirectModule(url, req, res, wwwroot);
        if (this.isCommonModule(url))                   return this.redirectModule(url, req, res, commonroot);

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
            res.sendFile(bundlefilepath);
            // res.redirect(302, bundlefilepath.substring(rootpath.length-1));
        } catch (e) {
            res.status(404).send(`${url} not found`);
        }
    }

    async redirectModule(url, req, res, rootpath) {
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
        if (!res.getHeader('content-type')) res.setHeader('Content-Type', "application/javascript; charset=UTF-8");
        if (!res.getHeader('content-type')) res.setHeader('Content-Type', "text/html; charset=UTF-8");
        res.send(ModuleResolver.buildIndex(idx, innerhtml), req, res);
    }

    sendThoregonLoaderSetup(req, res) {
        this.sendThoregonFile('/evolux.modules/evolux.universe//lib/reliant/utils/serviceworkersetup.mjs', req, res);
    }

    sendThoregonLoader(req, res) {
        this.sendThoregonFile('/evolux.modules/evolux.universe//lib/reliant/templates/universe-service.mjs', req, res);
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

    sendThoregon(req, res) {
        let modurl = path.join(process.cwd(), this.root, 'thoregon.html');
        if (fs.existsSync(modurl)) {
            res.set('Cache-Control', 'public, max-age=86400');
            res.sendFile(modurl);
        } else {
            // don't send an error, just send an empty file;
            // if (!res.getHeader('content-type')) res.setHeader('Content-Type', "application/javascript; charset=UTF-8");
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

    sendEmbedded(req, res) {
        let params = this.useParams(req, res);
        params.embedded = true;
        if (!params.nature)  params.nature = 'reliant';
        if (!params.density) params.density = (req.headers.host.startsWith('localhost') || req.headers.host.startsWith('127.0.0.1')  || req.headers.host.startsWith('::1')) ? 'lite' : 'rich';
        if (!res.getHeader('content-type')) res.setHeader('Content-Type', "application/javascript; charset=UTF-8");
        res.send(ModuleResolver.buildBootScript(boot, this.embedded, params), req, res);
    }

    // todo [REFACTOR]: extract an move to browserloader plugins from thoregon.aurora
    async sendUITemplates(thoregonroot, req, res) {
        // this
        let templates = await AuroraResolver.findTemplates(thoregonroot);
        let src = `export default ${JSON.stringify(templates)}`;
        if (!res.getHeader('content-type')) res.setHeader('Content-Type', "application/javascript; charset=UTF-8");
        res.send(src);
    }

    async sendModuleUI(url, referrer, req, res) {
        let tplpath = path.join(process.cwd(), new URL(referrer).pathname, '../../ui');
        let components = await AuroraResolver.buildUIComponents(tplpath, {});
        let src = `export default ${JSON.stringify(components)}`;
        // let src = `export default {}`;
        if (!res.getHeader('content-type')) res.setHeader('Content-Type', "application/javascript; charset=UTF-8");
        res.send(src);
    }

    sendUniverseServiceWorker(url, req, res) {
        // todo: ModuleResolver.buildServiceWorker()
        this.sendThoregonFile(SERVICEWORKERLOCATION, req, res);
    }

    async sendComponents(req, res, referer) {
        if (!res.getHeader('content-type')) res.setHeader('Content-Type', "application/javascript; charset=UTF-8");
        let script = await ModuleResolver.buildComponentsScript(referer, process.cwd(), cacheroot, { nature: 'reliant', density: 'rich' });
        res.send(script, req, res);
    }

    sendVapidPublicKey(req, res) {
        let vapidpath = path.join(commonroot, 'vapid.json');
        if (!fs.existsSync(vapidpath)) {
            res.status(404).send(`VAPID key not available`);
        } else {
            try {
                let vapid = JSON.parse(fs.readFileSync(vapidpath).toString('utf8'));
                res.send(vapid.publicKey);
            } catch (e) {
                this.logger.error('read VAPID keys', e);
                res.status(500).send(`VAPID key not available`);
            }
        }
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

    /*
     * Plugins
     */
}


class BrowserLoaderPlugin {

    /**
     * return a redirect URL to be resolved
     * @param url
     */
    redirect(url) {}

    /**
     * return object with 'content' and optional 'content-type'
     * e.g.:
     *   {
     *       type: 'application/javascript; charset=UTF-8',
     *       content: <String | Buffer>
     *   }
     * otherwise undefined
     *
     * @param url
     * @return {Object<{type, content}>}
     */
    sendContent(url) {}
}
