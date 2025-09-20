// register-hooks-sync.js
import { registerHooks } from 'node:module';


import Bootloader       from "./lib/loader/bootloader.mjs";
import process          from "process";
import crypto           from "crypto";
import fs               from "fs";
import dotenv           from "dotenv";
dotenv.config();

const baseURL           = new URL(`${process.cwd()}/`, 'file://');
const bootloader        = new Bootloader();


function resolveLocation(specifier/*, parentURL*/) {
    const nextResolve = (specifier, context) => {
        const url      = context.parentURL ? new URL(specifier, context.parentURL) : new URL(specifier, 'file:/'+process.cwd()+'/thoregon.mjs');
        return {
            url,
            shortCircuit: true  // NodeJS 18.x
        }
    }

    const nextLoad = (specifier, context) => {
        try {
            const fpath = specifier.substring(6);
            const source = (fs.readFileSync(fpath)).toString('utf8');
            return {
                source,
                shortCircuit: true  // NodeJS 18.x
            };
        } catch (ignore) {}
    }

    try {
        if (!specifier) return;

        if (specifier.startsWith('file:')) {
            const loaded = nextLoad(specifier);
            const source = loaded?.source;
            return source;
        }

        const procContext = { parentURL: /*parentURL ??*/ 'file:/'+process.cwd()+'/thoregon.mjs' };

        const resolved = bootloader.resolve(specifier, procContext, nextResolve);
        const url = resolved?.url;

        return typeof url === 'string' ? url : undefined;
    } catch (ignore) {
        console.log("source error", ignore);
    }
}

function content(specifier) {
    const url = resolveLocation(specifier);
    if (!url) return;
    const filename = url.substring(7);
    const content = fs.readFileSync(filename);
    return content;
}

function source(specifier/*, parentURL*/) {
    specifier = decodeURIComponent(specifier);
    const nextResolve = (specifier, context) => {
        const url      = context.parentURL ? new URL(specifier, context.parentURL) : new URL(specifier, 'file:/'+process.cwd()+'/thoregon.mjs');
        return {
            url,
            shortCircuit: true  // NodeJS 18.x
        }
    }

    const nextLoad = (specifier, context) => {
        try {
            const i = specifier.indexOf('/C:');
            const fpath = i > -1 ?  specifier.substring(i+1) : specifier.substring(6);
            const source = (fs.readFileSync(fpath)).toString('utf8');
            return {
                source,
                shortCircuit: true  // NodeJS 18.x
            };
        } catch (ignore) {
            console.log(ignore);
            debugger;
        }
    }

    try {
        if (!specifier) return;

        if (specifier.startsWith('file:')) {
            const loaded = nextLoad(specifier);
            const source = loaded?.source;
            return source;
        }

        const parenturl = ('file:/'+process.cwd()+'/thoregon.mjs').replaceAll('\\', '/');
        const procContext = { parentURL: /*parentURL ??*/ 'file:/'+process.cwd()+'/thoregon.mjs' };

        const resolved = bootloader.resolve(specifier, procContext, nextResolve);
        const url = resolved?.url;
        if (!url) return;

        const loaded = bootloader.load(url, procContext, nextLoad);
        const source = loaded?.source;
        return source;
    } catch (ignore) {
        console.log("source error", ignore);
    }
}

registerHooks({
    resolve(specifier, context, nextResolve) {
        // ...z.B. eigene Auflösung
        return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
        // ...z.B. Transform/Transpile
        return nextLoad(url, context);
    },
});
