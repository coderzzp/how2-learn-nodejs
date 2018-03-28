const path = require('path');

const mimeTypes = {
    'js': 'application/x-javascript',
    "css": "text/css",
    "gif": "image/gif",
    "html": "text/html",
    "ico": "image/x-icon",
    "jpeg": "image/jpeg",
};

exports.lookup = (pathName) => {
    let ext = path.extname(pathName);
    ext = ext.split('.').pop();
    return mimeTypes[ext] || mimeTypes['html'];
}

