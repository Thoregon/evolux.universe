/**
 *
 *
 * @author: Bernhard Lukassen
 */

import Mutation                 from "./mutation.mjs";

export default class PropertyMutation extends Mutation {

    constructor({
                    target,
                    property,
                    oldvalue,
                    newvalue
                }) {
        super();
        Object.assign(this, { target, property, oldvalue, newvalue });
    }

}
