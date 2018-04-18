const http = require('http');
const path = require('path');
const fs = require('fs')
const url = require('url')
const config = require('./config/default');
const {lookup} = require('./mime.js')

//一个简单的nodejs静态服务器构造函数

class StaticServer {
    constructor() {
      //配置
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
      //配置响应头Contenyt-Type:客户端会依据这个值来显示文件
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
      //先尝试直接返回该文件夹下的Index文件
      if (fs.existsSync(indexPagePath)) {
          this.respondFile(indexPagePath, req, res);
      } else {
        //读取文件夹下所有的文件和文件夹
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
          //如果请求路径末尾是'/'并且该请求文件是文件路径
        if (this.hasTrailingSlash(requestedPath) && stat.isDirectory()) {
            this.respondDirectory(pathName, req, res);
        } else if (stat.isDirectory()) {
        //如果仅满足请求文件是文件路径，重定向301到上一步
          this.respondRedirect(req, res);
        } else {
        //请求文件是文件，直接返回文件
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