const http = require('http');
const path = require('path');
const fs = require('fs')
const url = require('url')
const config = require('./config/default');
const {lookup} = require('./mime.js')

class StaticServer {
    constructor() {
      this.port = config.port;
      this.root = config.root;
      this.indexPage = config.indexPage;
      this.enableCacheControl = config.cacheControl;
      this.enableExpires = config.expires;
      this.enableETag = config.etag;
      this.enableLastModified = config.lastModified;
      this.maxAge = config.maxAge;
    }
    respondFile(pathName,req,res){
      const readStream = fs.createReadStream(pathName);
      res.setHeader('Content-Type', lookup(pathName));
      readStream.pipe(res)
    }
    respondNotFound(req,res){
      res.writeHead(404, {
        'Content-Type': 'text/html'
      });
      res.end(`<h1>Not Found</h1><p>The requested URL ${req.url} was not found on this server.</p>`);
    }
    respondRedirect(req, res) {
      const location = req.url + '/';
      res.writeHead(301, {
        'Location': location,
        'Content-Type': 'text/html'
      });
      res.end(`Redirecting to <a href='${location}'>${location}</a>`);
    }
    respondDirectory(pathName, req, res) {
      const indexPagePath = path.join(pathName, this.indexPage);
      if (fs.existsSync(indexPagePath)) {
          this.respondFile(indexPagePath, req, res);
      } else {
        fs.readdir(pathName, (err, files) => {
          if (err) {
            res.writeHead(500);
            return res.end(err);
          }
          const requestPath = url.parse(req.url).pathname;
          let content = `<h1>Index of ${requestPath}</h1>`;
          files.forEach(file => {
            let itemLink = path.join(requestPath,file);
            const stat = fs.statSync(path.join(pathName, file));
            if (stat && stat.isDirectory()) {
                itemLink = path.join(itemLink, '/');
            }                 
            content += `<p><a href='${itemLink}'>${file}</a></p>`;
          });
          res.writeHead(200, {
            'Content-Type': 'text/html'
          });
          res.end(content);
        });
      }
    }
    hasTrailingSlash(requestedPath){
      const len=requestedPath.length-1
      return requestedPath[len]=='/'? true : false
    }
    routeHandler(pathName, req, res) {
      fs.stat(pathName, (err, stat) => {
      if (!err) {
        const requestedPath = url.parse(req.url).pathname;
          if (this.hasTrailingSlash(requestedPath) && stat.isDirectory()) {
            this.respondDirectory(pathName, req, res);
          } else if (stat.isDirectory()) {
            this.respondRedirect(req, res);
          } else {
            this.respondFile(pathName, req, res);
          }
        } else {
          this.respondNotFound(req, res);
        }
      });
    }
    start() {
      http.createServer((req, res) => {
        const pathName = path.join(this.root, path.normalize(req.url));
        this.routeHandler(pathName, req, res);
      }).listen(this.port, err => {
        if (err) {
          console.error(err);
          console.info('Failed to start server');
        } else {
          console.info(`Server started on port ${this.port}`);
        }
      });
    }
}

module.exports = StaticServer;