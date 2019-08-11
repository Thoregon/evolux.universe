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

import fs               from 'fs';
import path             from 'path';
import rollup           from 'rollup';
import setup            from '../setup.mjs';
import config           from './config.mjs';

import moduleresolver   from '../modules/moduleresolver.mjs';
// import EError   from '/tr/evolux.supervise';

let stp;
let cfg;

export default class BrowserLoader {

    constructor({
        root = './',
        index = 'index.html',
        cachelocation = './toregon/jscache',
        moduleroot = './node_modules'
    } = {}) {
        Object.assign(this, {
            root,
            index,
            cachelocation,
            moduleroot
        });
    }

   static serve({
        root = './',
        index = 'index.html',
        cachelocation = './.thoregon/jscache',
        moduleroot = './node_modules'
    } = {}) {
        let loader = new this({ root, index, cachelocation, moduleroot });

        stp = setup(root);
        let env = stp.env;
        env.wwwroot = root;
        cfg = config(env);

        return (req, res, next) => loader.http(req, res, next);
    }

    http(req, res, next) {
        let url = req.originalUrl;
        console.log(url);
        // todo: check for 'nodejs' modules in node_modules, get "main", transpile with rollup
        if (url.startsWith("/evolux.universe")) return this.sendUniverse(url, req, res);
        if (url.startsWith("/tr/"))             return this.sendModule(url, req, res);
        if (this.existsStatic(url))             return this.sendFile(url, req, res);
        // todo: this should be a middleware, only serve index, analyse url and give next() a chance!
        return this.sendIndex(req, res);
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
        if (url === '/evolux.universe/config.mjs') {
            res.type('.mjs');
            this._setModuleContentType(res);
            res.send(cfg);
        } else if (url === '/evolux.universe/index.mjs' || url === '/evolux.universe') {
            filename = path.join(process.cwd(), this.moduleroot, 'evolux.universe/index.reliant.mjs');
            this._setModuleContentType(res);
            res.sendFile(filename);
        } else {
            let filename = path.join(process.cwd(), this.moduleroot, url);
            if (fs.existsSync(filename)) {
                this._setModuleContentType(res);
                res.sendFile(filename);
            } else {
                res.status(404).send(`${url} not found`);
            }
        }
    }

    /**
     * send a node module packaged for the browser
     *
     * @param url
     * @param req
     * @param res
     */
    async sendModule(url, req, res) {
        try {
            let modulename = url.substr(4);
            let bundlefilepath = await this.checkCache(url);
            if (!bundlefilepath) bundlefilepath = await this.build(moduleresolver.resolveModule(modulename, this.moduleroot), modulename);
            res.sendFile(path.join(process.cwd(), bundlefilepath));
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

    ensureCache() {
        let cachepath = path.join(process.cwd(), this.cachelocation);
        // todo: make each sub dir! otherwise may throw an error
        if (!fs.existsSync(cachepath)) fs.mkdirSync(cachepath);
        return true;
    }

    async build(url, modulename) {
        this.ensureCache();

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
        this.sendFile(this.index, req, res);
    }

    sendFile(filepath, req, res) {
        res.set('Cache-Control', 'public, max-age=86400');
        res.sendFile(path.join(process.cwd(), this.root, filepath));
    }

    existsStatic(filepath) {
        return fs.existsSync(path.join(process.cwd(), this.root, filepath));
    }

    _setModuleContentType(res) {
        if (!res.getHeader('content-type')) res.setHeader('Content-Type', "application/javascript");
    }
}
