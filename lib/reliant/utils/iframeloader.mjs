/**
 *
 *
 * @author: Bernhard Lukassen
 */


import { movePageInfo, getIcons, applyIcons } from "./htmlutils.mjs";

export default (url) => {
    let body = document.getElementsByTagName('body')[0];
    let app = document.createElement('iframe');
    app.src = url;
    body.appendChild(app);
    app.contentWindow.universe = window.universe;
    app.contentWindow.thoregon = window.thoregon;
    app.onload = (event) => movePageInfo(document, app.contentDocument);
}
