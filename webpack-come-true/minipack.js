const fs = require('fs');
const path = require('path');
const babylon = require('babylon');
const traverse = require('babel-traverse').default;
const {transformFromAst} = require('babel-core');

let config = {}

/**
 * 获取文件，解析成ast语法
 * @param filename
 * @returns {*}
 */
function getAst (filename) {
  const content = fs.readFileSync(filename, 'utf-8')
  return babylon.parse(content, {
    sourceType: 'module',
  });
}
/**
 * 通过ast得到该代码的依赖 
 * 具体文档：https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md#toc-babel-traverse
 * @param filename
 * @returns {*}
 */
function getDependence (ast) {
  let dependencies = []
  traverse(ast, {
    ImportDeclaration: ({node}) => {
      dependencies.push(node.source.value);
    },
  })
  return dependencies
}

/**
 * 通过ast生成code
 * @param ast
 * @returns {*}
 */
function ast2code(ast) {
  const {code} = transformFromAst(ast, null, {
    presets: ['env']
  });
  return code
}

/**
 * 解析代码，生成完整的文件依赖关系映射
 * @param fileName
 * @param entry
 * @returns {{fileName: *, dependence, code: *}}
 */
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

/**
 * 获取深度队列依赖关系，类似于递归调用，解析并获得所有解析后的模块
 * @param main
 * @returns {*[]}
 */
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
/**
 * 打包，通过队列中所有的模块信息，生成modules映射，并且递归调用所有模块的函数
 * @param main
 * @returns {*[]}
 */
function bundle(queue) {
  let modules = ''
  //先通过queue生成modules映射对象
  queue.forEach(function (mod) {
    modules += `'${mod.fileName}': function (require, module, exports) { ${mod.code} },`
  })
  //下面这段result即bundle文件，可以看到result是一个自执行的函数，自执行函数中有一个有一个require函数，require函数会提取modules中对应的映射函数，并将
  //require, module, module.exports三个参数传到该映射函数中，这时，如果映射函数内部还有require其他模块，就会用到我们这里传入的requrie，形成递归
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

function bundleFile(option) {
  config = option
  let mainFile = parse(config.entry, true)

  let queue = getQueue(mainFile)
  return bundle(queue)
}

module.exports = bundleFile