/**
 *
 *
 * @author: Bernhard Lukassen
 */

import Mutation                 from "./mutation.mjs";

export default class IndexMutation extends Mutation {

    constructor({
                    id
                } = {}) {
        super();
        Object.assign(this, {id});
    }

}
