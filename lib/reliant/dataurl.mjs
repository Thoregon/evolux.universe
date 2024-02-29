/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

async function getHttpDataURL(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const mimeType = response.headers.get('content-type') || 'application/octet-stream';
    const data        = await response.arrayBuffer(); // Read as array buffer for efficiency
    const base64data = Buffer.from(data).toString('base64');
    const dataURL    = `data:${mimeType};base64,${base64data}`;
    return dataURL;
}

export async function fetchDataUrlFrom(url) {
    if (url.startsWith("file:")) {
        throw Error(`fetch file: not available: ${url}`);
    } else if (url.startsWith("http:") || url.startsWith("https:")) {
        const url = new URL(surl);
    }
    throw Error(`fetch not available for: ${url}`);
}
