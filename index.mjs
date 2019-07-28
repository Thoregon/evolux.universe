/**
 * Collect all exports from lib/
 *
 * @author: blukassen
 */

import p from './lib/protouniverse.mjs';
import b from './lib/browserloader.mjs';

export const browserloader = b;
export const protouniverse = p;
import letThereBeLight from './lib/letThereBeLight.mjs';
export default letThereBeLight;
