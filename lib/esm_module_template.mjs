
function isFunction(obj) {
    return !!(obj && obj.constructor && obj.call && obj.apply);
};

const module = { exports: {} };
let exports = module.exports;

function define(p1, p2) {
    module.exports = isFunction(p1) ? p1() : isFunction(p2) ? p2() : {};
}
define.amd = true;

/*******************************************************/
// code goes here
/*******************************************************/

export default module.exports;
