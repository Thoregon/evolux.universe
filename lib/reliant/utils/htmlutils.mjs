/**
 *
 *
 * @author: Bernhard Lukassen
 */

const isIcon = ($elem) => {
    let $rel = $elem.getAttribute('rel');
    // Technically it could be null / undefined if someone didn't set it!
    // People do weird things when building pages!
    return $rel && $rel.toLowerCase().indexOf('icon') > -1;
};

export const applyIcons = (doc, icons) => {
    // first remove icons
    let $links = [...doc.getElementsByTagName('link')];
    $links.forEach($link => {
        if (isIcon($link)) $link.remove();
    });

    let $head = doc.getElementsByTagName('head')[0];
    icons.forEach(icon => {
        let $icon = doc.createElement('link');
        $icon.setAttribute('rel', 'icon');
        if (icon.type) $icon.setAttribute('type', icon.type);
        if (icon.sizes) $icon.setAttribute('sizes', icon.sizes);
        $icon.setAttribute('href', icon.href);
        $head.appendChild($icon);
    })
};

export const getIcons = (doc) => {
    let $links = [...doc.getElementsByTagName('link')];
    let icons = [];

    $links.forEach($link => {
        if (isIcon($link)) {
            let href    = $link.getAttribute('href');
            let sizes   = $link.getAttribute('sizes');
            let type    = $link.getAttribute('type');
            // only with a href the icon makes sense
            if (href) {
                let url     = new URL(href, doc.location.href);
                let icon    = { href: url.href };
                if (sizes)  icon.sizes = sizes;
                if (type)   icon.type = type;
                icons.push(icon);
            }
        }
    });

    return icons;
};

export const movePageInfo = (doc, subdoc) => {
    let title = subdoc.title;
    let icons = getIcons(subdoc);
    // todo: set on top document
    doc.title = title;
    if (icons && icons.length) applyIcons(doc, icons);
};

/*
 * todo: problems
 *  - refresh button requests iframe url
 *  - back/forward button sends 'onhashchange' event on first click (find out what goes on here)
 *  - propagate back/forward button to iframe
 */
export const propagateRoutes = (win, subwin) => {
    const handleHistoryPush = (event) => {
        if (!event) return;
        console.log("history push", event);
        let title = subwin.title;
        let state = event.state;
        let href = subwin.location.href;
        win.history.pushState(state, title, href);
    };
    const handleHistoryReplace = (event) => {
        if (!event) return;
        console.log("history replace", event);
        let title = subwin.title;
        let state = event.state;
        let href = subwin.location.href;
        win.history.replaceState(state, title, href);
    };
    const handleHistoryPop = (event) => {
        if (!event) return;
        console.log("history pop", event);
        let title = subwin.title;
        let state = event.state;
        let href = subwin.location.href;
        win.history.pushState(state, title, href);
    };
    const addHistoryOnPush = (history) => {
        var pushState = history.pushState;
        history.pushState = function(state) {
            let pushResult = pushState.apply(history, arguments);
            if (typeof history.onpushstate === "function") {
                history.onpushstate({state: state});
            }
            return pushResult;
        };
    };
    const addHistoryOnReplace = (history) => {
        var replaceState = history.replaceState;
        history.replaceState = function(state) {
            let replaceResult = replaceState.apply(history, arguments);
            if (typeof history.onreplacestate === "function") {
                history.onreplacestate({state: state});
            }
            return replaceResult;
        };
    };

    addHistoryOnPush(subwin.history);
    addHistoryOnReplace(subwin.history);

    subwin.onpopstate = handleHistoryPop;
    subwin.history.onpushstate = handleHistoryPush;
    subwin.history.onreplacestate = handleHistoryReplace;

    win.history.go = ((hist) => {
        const fn = win.history.go;
        return (i) => { console.log("go", i); fn.apply(hist, arguments); }
    })(win.history);
    win.history.back = ((hist) => {
        const fn = win.history.back;
        return () => { console.log("back"); fn.apply(hist, arguments); }
    })(win.history);
    win.history.forward = ((hist) => {
        const fn = win.history.forward;
        return () => { console.log("forward"); fn.apply(hist, arguments); }
    })(win.history);

    win.onhashchange = (event) => console.log("hash change", event);
};
