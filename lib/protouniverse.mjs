/**
 * publish only allowed functions while the universe is a protounivers --> has not been inflated
 *
 * @author: blukassen
 */

import universe from './universe.mjs';
const hooksDawn = [];
const hooksDusk = [];
let _timeout4dawn;

const whichGlobal = () => (!this && !!global) ? global : window;

if (!whichGlobal().protouniverse) {
    const protouniverse = {

        /**
         * Register hook functions to be executed when inflation ends (at dawn).
         * Can be async, inflation waits until all hooks have returned,
         * so be careful what you do.
         * @param {Function} hookfn
         */
        atDawn(hookfn) {
            if (hooksDawn.indexOf(hookfn) > -1) {
                this.logger.log('warn', 'universe: dawn hook %s already registered', hookfn.name);
                return;
            }
            hooksDawn.push(hookfn);
        },

        /**
         * Register hook functions to be executed when universe freezes (at dusk).
         * Can be async, waits until all hooks have returned,
         * so be careful what you do.
         * @param {Function} hookfn
         */
        atDusk(hookfn) {
            if (hooksDusk.indexOf(hookfn) > -1) {
                this.logger.log('warn', 'universe: dusk hook %s already registered', hookfn.name);
                return;
            }
            hooksDusk.push(hookfn);
        },

        /**
         * just meant for testing. Shuold not be neccessary in production
         *
         * @param seconds
         */
        set timeout4dawn(seconds) {
            _timeout4dawn = seconds;
        },

        get timeout4dawn() {
            return _timeout4dawn;
        },

        /**
         * rather private function, no need in the config scripts to be invoked
         *
         * @returns {{dusk: Array, dawn: Array}}
         */
        getHooks() {
            return {
                dusk: hooksDusk,
                dawn: hooksDawn
            }
        }
    };

    whichGlobal().protouniverse = protouniverse;
}

export default whichGlobal().protouniverse;

