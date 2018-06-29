//feature：添加缓存机制
const http = require('http');
const path = require('path');
const fs = require('fs')
const url = require('url')
const config = require('./config/default');
const {lookup} = require('./mime.js')

//带有缓存机制的静态服务器
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
    responseFile(pathName,res){
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
          this.responseFile(indexPagePath, req, res);
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
    //设置etag的一种简单方式
    generateETag(stat) {
      const mtime = stat.mtime.getTime().toString(16);
      const size = stat.size.toString(16);
      return `W/"${size}-${mtime}"`;
    }

    setFreshHeaders(stat, res) {
      //关于缓存可以在https://www.cnblogs.com/wonyun/p/5524617.html参考
      //从stat里拿到信息
      const lastModified = stat.mtime.toUTCString();
      //强缓存
      if (this.enableExpires) {
          const expireTime = (new Date(Date.now() + this.maxAge * 1000)).toUTCString();
          res.setHeader('Expires', expireTime);
      }
      if (this.enableCacheControl) {
          res.setHeader('Cache-Control', `public, max-age=${this.maxAge}`);
      }
      //弱缓存
      if (this.enableLastModified) {
          res.setHeader('Last-Modified', lastModified);
      }
      if (this.enableETag) {
          res.setHeader('ETag', this.generateETag(stat));
      }
    }
    responseNotModified(res) {
      res.statusCode = 304;
      res.end();
    }
    isFresh(reqHeaders, resHeaders) {
      const  noneMatch = reqHeaders['if-none-match'];
      const  lastModified = reqHeaders['if-modified-since'];
      if (!(noneMatch || lastModified)) return false;
      if(noneMatch && (noneMatch !== resHeaders['etag'])) return false;
      if(lastModified && lastModified !== resHeaders['last-modified']) return false;
      return true;
    }
    respond(pathName, req, res) {
      fs.stat(pathName, (err, stat) => {
          if (err) return respondError(err, res);
          //设置带缓存机制的响应头
          this.setFreshHeaders(stat, res);
          //通过请求头，和响应头，判断资源是否是新鲜的（在弱缓存有效期内）
          if (this.isFresh(req.headers, res._headers)) {
              this.responseNotModified(res);
          } else {
          //请求头不新鲜，直接返回文件
              this.responseFile(pathName, res);
          }
      });
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
            //注意这里换成了respond，相比之前有所不同
            this.respond(pathName, req, res);
          }
        } else {
          this.respondNotFound(req, res);
        }
      });
    }
    start() {
      http.createServer((req, res) => {
        console.log('我收到了请求！')
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