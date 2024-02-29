/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import fs   from "fs/promises";
import path from "path";
import mime from "mime-types";

async function getFileDataURL(fileURL) {
    const filePath   = path.normalize(fileURL.replace(/^file:\/\//, ''));
    const data       = await fs.readFile(filePath);
    const mimeType   = mime.lookup(filePath) || 'application/octet-stream'; // default MIME type
    const base64data = Buffer.from(data).toString('base64');
    const dataURL    = `data:${mimeType};base64,${base64data}`;
    return dataURL;
};

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
        return getFileDataURL(url);
    } else if (url.startsWith("http:") || url.startsWith("https:")) {
        return getHttpDataURL(url);
    }
    throw Error(`fetch not available for: ${url}`);
}
