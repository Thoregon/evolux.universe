/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import * as util from "/evolux.util";

//
// globals available functions and entities
//

export const vanillaT͛ = {
    parseCSV: util.parseCSV
}

export const installT͛ = () => Object.entries(vanillaT͛).forEach(([name, fn]) => universe.global(name, fn, { doThrow: false }));

//
// polyfills for Object, Array and older environemnts
//



//
// browser polyfills (HTML)Element
//
