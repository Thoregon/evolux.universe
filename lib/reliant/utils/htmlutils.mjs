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
