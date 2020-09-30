const fs = require("fs")
const path = require("path")
const { VM } = require("vm2")
const crypto = require('crypto')

class Base {
  constructor({ dir, mainDir = '', root = '', filename = '', moreInfo = false } = {}) {
    this.dir = dir // 基包和mainDir相同，分包 =mainDir+root
    this.mainDir = mainDir || dir  // .../xx/_645215777_78/  wxapkg同名目录
    this.root = root  // 分包： subPackages.root
    this.filename = filename
    this.moreInfo = moreInfo
    this.pathSep = path.sep
  }

  getFileContent(filename, encoding = 'utf8') {
    return fs.readFileSync(filename, { encoding })
  }
  getDir(filename) {
    const ext = path.extname(filename)
    return path.resolve(filename, "..", path.basename(filename, ext))
  }
  getFileDir(filename) {
    return path.dirname(filename)
  }
  getFileName(filePath, ext) {
    return path.basename(filePath, ext)
  }
  static getDir(filename) {
    const ext = path.extname(filename)
    return path.resolve(filename, "..", path.basename(filename, ext))
  }
  getExactStoreDir(dir = process.cwd(), ...arg) {
    const extrat = path.isAbsolute(dir)
      ? path.join(dir, ...arg)
      : path.join(process.cwd(), dir, ...arg)
    return extrat
  }
  getPathName(name, dir = this.dir) {
    // 放在wxapkg同名目录下
    return path.resolve(dir, name)
  }
  getAbsolutePath(...args) {
    return path.resolve(...args)
  }
  mkdirsSync(dirname) {
    if (fs.existsSync(dirname)) {
      return true
    } else {
      if (this.mkdirsSync(path.dirname(dirname))) {
        fs.mkdirSync(dirname)
        return true
      }
    }
  }
  changeExt(name, ext = '') {
    return name.slice(0, name.lastIndexOf(".")) + ext
  }
  isExistFile(filename, dir = this.dir) {
    return fs.existsSync(this.getPathName(filename, dir))
  }
  getWorkerPath(name) {
    let code = this.getFileContent(name)
    let commPath = false
    let vm = new VM({
      sandbox: {
        require() {
        },
        define(name) {
          name = path.dirname(name) + '/'
          if (commPath === false) commPath = name
          commPath = this.commonDir(commPath, name)
        }
      }
    })
    vm.run(code.slice(code.indexOf("define(")))
    if (commPath.length > 0) commPath = commPath.slice(0, -1)
    console.log("Worker path: \"" + commPath + "\"")
    return commPath
  }
  commonDir(pathA, pathB) {
    if (pathA[0] == ".") pathA = pathA.slice(1)
    if (pathB[0] == ".") pathB = pathB.slice(1)
    pathA = pathA.replace(/\\/g, '/')
    pathB = pathB.replace(/\\/g, '/')
    let a = Math.min(pathA.length, pathB.length)
    for (let i = 1, m = Math.min(pathA.length, pathB.length); i <= m; i++) if (!pathA.startsWith(pathB.slice(0, i))) {
      a = i - 1
      break
    }
    let pub = pathB.slice(0, a)
    let len = pub.lastIndexOf("/") + 1
    return pathA.slice(0, len)
  }
  toDir(to, from) {//get relative path without posix/win32 problem
    if (from[0] == ".") from = from.slice(1)
    if (to[0] == ".") to = to.slice(1)
    from = from.replace(/\\/g, '/')
    to = to.replace(/\\/g, '/')
    let a = Math.min(to.length, from.length)
    for (let i = 1, m = Math.min(to.length, from.length); i <= m; i++)
      if (!to.startsWith(from.slice(0, i))) {
        a = i - 1
        break
      }
    let pub = from.slice(0, a)
    let len = pub.lastIndexOf("/") + 1
    let k = from.slice(len)
    let ret = ""
    for (let i = 0; i < k.length; i++)
      if (k[i] == '/') ret += '../'
    return ret + to.slice(len)
  }
  scanDirByExt(dir, ext) {
    const result = []
    const scanDir = (dir) => {
      const files = fs.readdirSync(dir)
      for (const file of files) {
        const name = this.getPathName(file, dir)
        const stats = fs.statSync(name)
        if (stats.isDirectory()) scanDir(name)
        else if (stats.isFile() && name.endsWith(ext)) result.push(name)
      }
    }
    scanDir(dir)
    return result
  }
  scanDir(dir, ext = '.wxapkg', deps = 0) {
    const result = []
    const scanDir = (dir, deps) => {
      const files = fs.readdirSync(dir)
      for (const file of files) {
        const name = this.getPathName(file, dir)
        const stats = fs.statSync(name)
        if (stats.isDirectory() && deps > 0) scanDir(name, ext, deps - 1)
        else if (stats.isFile() && name.endsWith(ext)) result.push(name)
      }
    }
    scanDir(dir, deps)
    return result
  }
  findDirByName(dir, filename) {
    const scanDir = (dir) => {
      const files = fs.readdirSync(dir)
      let res
      for (const file of files) {
        const name = this.getPathName(file, dir)
        const stats = fs.statSync(name)
        if (stats.isDirectory()) {
          res = scanDir(name)
          if (res) return res
        }
        else if (stats.isFile() && file === filename) return name
      }
    }
    return scanDir(dir)
  }
  save(filename, content) {
    const pathFile = path.dirname(filename)
    this.mkdirsSync(pathFile)
    fs.writeFileSync(filename, content)
  }

  vmRun(code, opt) {
    try {
      const vm = new VM(opt)
      return vm.run(code)
    } catch (e) {
      console.log('VM err:', e)
    }
  }

  preSubPack(file = 'app-service.js') {
    const name = this.findDirByName(this.dir, file)
    console.log('subPack root: %s \n%s', file, name)
    console.log('dir: %s', this.dir)
    return name
  }
  md5(str, inputEncoding = 'base64', encoding) {
    return crypto
      .createHash('md5')
      .update(str, inputEncoding) // 无inputEncoding utf8(str)
      .digest(encoding) // 无encoding ： buffer
  }
}

module.exports = {
  Base
}