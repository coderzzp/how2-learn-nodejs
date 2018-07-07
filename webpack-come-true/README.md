## 从0实现一个webpack  
### 什么是webpack？
WebPack可以看做是模块打包机：它做的事情是，分析你的项目结构，找到JavaScript模块以及其它的一些浏览器不能直接运行的拓展语言（jsx，TypeScript等），并将其转换和打包为合适的格式供浏览器使用。如果你不了解webpack的用法，可以转到[阮一峰的webpack教程](https://github.com/ruanyf/webpack-demos)先学习一下webpack的用法。
### webpack最简单的用法    
``` shell
git clone https://github.com/coderzzp/how2-learn-nodejs.git
cd how2-learn-nodejs
cd webpack-demo
```
这是一个最简单的webpac的例子，可以简单看一下文件目录，之后继续执行
```shell
npm i 
npm run dev
```
命令行出现
![image](https://user-images.githubusercontent.com/24691802/42312561-303901e4-8073-11e8-98ea-1947620c07c5.png)

即打包完成。
看到目录下多了一个dist文件，里面有一个bundle文件，这其实就是在执行npm run dev即package.json脚本中的webpack命令，此时我们打开页面
```shell
open index.html
```
![image](https://user-images.githubusercontent.com/24691802/42312674-869ec320-8073-11e8-93a6-1cb24fdb0d51.png)

页面输出hello world~，显然页面里的./dist/bundle.js就是以index.js为入口文件打包后的文件
### bundle.js是怎么打包index.js+words.js的呢？
我们打开dist/bundle.js来看一下,虽然只有100行的代码一眼看过去因为各种注释的关系显得很乱，但是仔细看一下整个代码结构实际上是一个自执行函数，直接传入一个对象即mudules.
```javascript
(function(modules) {
})({
   "./index.js": function(...){...},
   "./words.js": function(...){...}
})
```
而这里的modules正是我们需要打包的文件对象，类似
```javascript
{
  "文件位置"：函数，
  "文件位置"：函数
}
```
那么我们再来看看自执行函数内部是如何使用mudules这个对象的，首先看这个函数的返回值是：
```javascript
return __webpack_require__(__webpack_require__.s = "./index.js");
```
接着看_webpack_require__这个最核心的函数：
```javascript
/******/ 	//缓存对象
/******/    var installedModules = {};
/******/ 	// 定义require函数
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// 如果缓存对象中有，即取出返回值
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// 创建一个mudule对象
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// 执行mudules对象中的函数,传入（module，module.exports，__webpack_require__）
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
```
这段代码中最重要的代码如下，利用call方法执行modules中的代码
```javascript
modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
```
传入了三个参数：module, module.exports,和__webpack_require_，再回过头来看mudules对象用这些参数做了什么？
index.js:  
![image](https://user-images.githubusercontent.com/24691802/42315673-9cb7a076-807a-11e8-96a7-86e61dbd95ed.png)
主要是将require替换成传入的__webpack_require_，相当于在index.js中我们每次requrie时，会调用__webpack_require_这个函数，递归策略~  

words.js:  
![image](https://user-images.githubusercontent.com/24691802/42315727-c197b688-807a-11e8-93bc-5f13b2e50a98.png)
想象一下这个bundle.js执行的过程，函数调用栈先执行index.js中的代码，此时在代码中会碰到__webpack_require（'./words.js），那么调用栈继续执行words.js中的代码，words.js通过module.exports导出’hello world‘，退出words.js调用栈，回到index.js，继续执行剩余代码，然后返回module.exports，因为index.js是入口文件，module.exports={}，代码执行结束。
### 理解AST的存在
好了，交代完原理，无论你是了然于胸还是一知半解，都一起来跟着做一个webpack吧，毕竟实践出真知。
但是这一节明显还没有动手的意思，先了解一下什么是AST抽象语法树，AST抽象语法树是编译器经常会涉及到的一个概念，代码=>AST=>转换=>生成=>机器理解的代码，AST通常是树形结构，在js中用对象来表示这个树形结构。可以在这个[网站](http://esprima.org/demo/parse.html#)尝试将代码转换为AST，大致理解了AST，可是这里为什么要用到AST呢？  
- 将ES6代码转换为ES5（通过babel生成AST并将AST转换为普通的ES5代码）
- 生成代码依赖，即生成modules对象（babel依旧可以完成这个任务）
![image](https://user-images.githubusercontent.com/24691802/42318033-6dc482f6-8080-11e8-8ad2-61beac75a7e4.png)
### 完成代码
直接上代码吧：定义了三个辅助函数getAst，getDependence，ast2code  
```javascript
//获取文件，解析成ast语法
function getAst (filename) {
  const content = fs.readFileSync(filename, 'utf-8')
  return babylon.parse(content, {
    sourceType: 'module',
  });
}

 //通过ast得到该代码的依赖 
function getDependence (ast) {
  let dependencies = []
  traverse(ast, {
    ImportDeclaration: ({node}) => {
      dependencies.push(node.source.value);
    },
  })
  return dependencies
}

//通过ast生成code
function ast2code(ast) {
  const {code} = transformFromAst(ast, null, {
    presets: ['env']
  });
  return code
}
```
基于上面的三个函数，生成了一个解析代码的函数
```javascript
//解析代码，生成完整的文件依赖关系映射

function parse(fileName, entry) {
  let filePath = fileName.indexOf('.js') === -1 ? fileName + '.js' : fileName
  let dirName = entry ? '' : path.dirname(config.entry)
  let absolutePath = path.join(dirName, filePath)
  const ast = getAst(absolutePath)
  return {
    fileName,
    dependence: getDependence(ast),
    code: ast2code(ast),
  };
}
```
这个时候我们是完成了ES6到ES5的转换，并且我们得到了入口文件的所有dependence（依赖），之前我们提到，所有依赖也要解析，于是有了下面的代码，递归解析所有的依赖
```javascript
//获取深度队列依赖关系，类似于递归调用，解析并获得所有解析后的模块

function getQueue(main) {
  let queue = [main]
  for (let asset of queue) {
    asset.dependence.forEach(function (dep) {
      let child = parse(dep)
      queue.push(child)
    })
  }
  return queue
}
```
我们得到了这个queue相当于是我们项目所需要的所有文件被解析之后的代码，现在只需要执行最后一步：打包：
```javascript
function bundle(queue) {
  let modules = ''
  //先通过queue生成modules映射对象
  queue.forEach(function (mod) {
    modules += `'${mod.fileName}': function (require, module, exports) { ${mod.code} },`
  })
  //
  const result = `
    (function(modules) {
      function require(fileName) {
        const fn = modules[fileName];
        const module = { exports : {} };
        fn(require, module, module.exports);
        return module.exports;
      }
      require('${config.entry}');
    })({${modules}})
  `;

  // We simply return the result, hurray! :)
  return result;
}
```
是不是跟我们之前解析的webpack的代码如出一辙，到这一步就基本完成了一个简易的webpack了  
[完整代码地址戳这里](https://github.com/coderzzp/how2-learn-nodejs/tree/master/webpack-come-true)




