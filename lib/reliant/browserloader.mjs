import fs               from 'fs';
import path             from 'path';
import setup            from '../setup.mjs';
import express          from '/express';
import cors             from '/cors';
import moduleresolver   from '../modules/moduleresolver.mjs';
import config           from './config.mjs';
import ThoregonLoader   from "../thoregonloader.mjs";

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

// import EError   from '/evolux.supervise';

const BOOT_SCRIPT   = 'boot.template.mjs';
const INDEX_DOC     = 'index.template.html';

const app = express();

let thoregonloader;

let stp;            // result of setup()
let cfg;            // result of config(env)
let idx;            // artificial index html for the browser to boot
let boot;           // boot script to be loaded from the browser
let wwwroot;        // content root directory
let modroot;        // module root directory --> 'node_modules'
let scrroot;        // script root directory --> 'bower_components'
let cacheroot;      // cache root directory

export default class BrowserLoader {

    constructor({
                    root,
                    index,
                    cachelocation,
                    moduleroot,
                    scriptroot,
                    port
                } = {}) {
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
                 root = './',
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
        modroot         = path.join(wwwroot, moduleroot);
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
        let templatepath    = path.join(modroot, 'evolux.universe/lib/reliant/templates');
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
        let url     = req.originalUrl;
        // let etag    = req.headers['if-none-match'];
        console.log(url);
        // todo: check for 'nodejs' modules in node_modules, get "main", transpile with rollup
        if (url === '/' || url === `/index.html`)   return this.sendIndex(req, res);
        if (url.startsWith('/boot'))                return this.sendBoot(req, res);
        if (thoregonloader.isThoregon(url))         return this.sendUniverse(url, req, res);
        if (this.isModule(url))                     return this.sendModule(url, req, res);
        next();
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
    sendUniverse(url, req, res) {
        let filename;
        // todo: use ThoregonLoader
        if (url === '/evolux.universe/config.mjs') {
            if (!cfg) {
                cfg = config(stp.env);
            }
            res.type('.mjs');
            this._setModuleContentType(res);
            res.send(cfg);
        } else if (url === '/evolux.universe/index.mjs' || url === '/evolux.universe') {
            filename = path.join(modroot, 'evolux.universe/index.reliant.mjs');
            this._setModuleContentType(res);
            res.sendFile(filename);
        } else if (url === '/evolux.universe/@webcomponents') {
            filename = path.join(modroot, 'evolux.universe/node_modules/@webcomponents/webcomponentsjs/webcomponents-bundle.js');
            this._setModuleContentType(res);
            res.sendFile(filename);
        } else {
            let filename = path.join(modroot, url);
            if (fs.existsSync(filename)) {
                this._setModuleContentType(res);
                res.sendFile(filename);
            } else {
                res.status(404).send(`${url} not found`);
            }
        }
    }

    isModule(url) {
        return url !== '/' && url.startsWith("/") && fs.existsSync(path.join(modroot, url.substr(1)));
    }

    /**
     * send a node module packaged for the browser
     *
     * @param url
     * @param req
     * @param res
     */
    async sendModule(url, req, res) {
        // todo: check referer for base module: req.header('Referer')
        try {
            let modulename = url.substr(1);
            let bundlefilepath = await this.checkCache(url);
            if (!bundlefilepath) {
                let module = await moduleresolver.resolveModule(modulename, modroot, cacheroot);
                // todo: build ES6 if 'node'
                bundlefilepath = module.url;
            }
            res.sendFile(bundlefilepath);
        } catch (e) {
            res.status(404).send(`${url} not found`);
        }
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

        console.log(bundle.watchFiles); // an array of file names this bundle depends on

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

    sendBoot(req, res) {
        let params = this.useParams(req, res);
        if (!params.nature)  params.nature = 'reliant';
        if (!params.density) params.density = (req.headers.host.startsWith('localhost') || req.headers.host.startsWith('127.0.0.1')  || req.headers.host.startsWith('::1')) ? 'lite' : 'rich';
        if (!res.getHeader('content-type')) res.setHeader('Content-Type', "application/javascript; charset=UTF-8");
        res.send(moduleresolver.buildBootScript(boot, this.index, params), req, res);
    }

    useParams(req, res) {
        return req.query;
    }

    sendFile(filepath, req, res) {
        res.set('Cache-Control', 'public, max-age=86400');
        res.sendFile(path.join(process.cwd(), this.root, filepath));
    }

    existsStatic(filepath) {
        return fs.existsSync(path.join(process.cwd(), this.root, filepath));
    }

    _setModuleContentType(res) {
        if (!res.getHeader('content-type')) res.setHeader('Content-Type', "application/javascript; charset=UTF-8");
    }
}
