/**
 * registry for busy processes, use for statistics
 *
 * todo:
 *  - pub/sub
 *  - timeouts
 *
 *  - later if needed: a topic stack if topic procs are nested (but I don't think its necessary)
 *
 * @author: Bernhard Lukassen
 */

// current busy state within this context, no persistence needed
const busyproc = {};

/**
 * register a busy process for a topic.
 * If topic is missing a generic 'busy' topic is used.
 *
 * @param topic
 */
export const busy   = (topic) => {
    if (!topic) topic = "busy";
    if (busyproc[topic]) return;
    busyproc[topic] = Date.now();
}

/**
 * process ready for topic, returns busy time im ms.
 * If topic is missing a generic 'busy' topic is used.
 *
 * @param topic
 */
export const ready  = (topic) => {
    if (!topic) topic = "busy";
    let busytime = busySince(topic);
    delete busyproc[topic];
    return busytime;
}

export const busySince  = (topic) => {
    if (!topic) topic = "busy";
    if (!busyproc[topic]) return 0;
    let busytime = Date.now() - busyproc[topic];
    return busytime;
}

export const isBusy = () => {
    return Object.keys(busyproc).length > 0;
}
