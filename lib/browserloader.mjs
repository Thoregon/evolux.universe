/**
 * The script will be loaded from a boot script, which detects the clients properties
 * and helps to build the right loader script.
 * This boot script will be referenced directly in the HTML.
 *
 * @author: blukassen
 */

export default class BrowserLoader {

    constructor(root) {
        this.root       = root ? root : "./";
        // this.uripath    = uripath;
    }

   static serve(root) {
        let loader = new this(root);
        return (req, res, next) => loader.http(req, res, next);
    }

    http(req, res, next) {
        let url = req.originalUrl;
        console.log(url);
        // todo: check for 'nodejs' modules in node_modules, get "main", transpile with rollup
        if (url.startsWith("/evolux")) this.load(url, req, res);
        next();
    }
    config(env, url) {

    }

    load(url, req, res) {
        res.type('.mjs');
        res.send(`
        export default () => {
            console.log("from broswerloader");
            return { stattest: 'Test', dev: 'Dev' };
        }
        `);
    }
}
