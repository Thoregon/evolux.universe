/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import * as util from "/evolux.util";

export const vanillaT = {
    parseCSV: util.parseCSV
}

export const installT͛ = () => Object.entries(vanillaT).forEach(([name, fn]) => universe.global(name, fn, { doThrow: false }));
