//执行文件
const fs =require('fs')
const minipack = require('./minipack')

const option={
  entry:'./example/app.js'
}
const packedCode = minipack(option)
fs.writeFileSync('bundle.js',packedCode)