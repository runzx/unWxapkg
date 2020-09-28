const fs = require("fs")
const path = require("path")
const { VM } = require("vm2")

class Base {
  constructor(dir) {
    this.dir = dir // 放在wxapkg同名目录
  }
  commandExecute(argv) {

  }
  getFileContent(filename, encoding = 'utf8') {

    return fs.readFileSync(filename, { encoding })
  }
  getDir(filename) {
    return path.resolve(filename, "..", path.basename(filename, ".wxapkg"))
    // this.getExactStoreDir(filename)
  }
  static getDir(filename, ext = '.wxapkg') {
    let f = filename
    if (path.extname(filename) !== '.wxapkg') f = path.dirname(filename)
    return path.resolve(f, "..", path.basename(f, ext))
    // this.getExactStoreDir(filename)
  }
  getExactStoreDir(dir = process.cwd(), ...arg) {
    const extrat = path.isAbsolute(dir)
      ? path.join(dir, ...arg)
      : path.join(process.cwd(), dir, ...arg)
    return extrat
  }
  getPathName(name) {
    // 放在wxapkg同名目录下
    return path.resolve(this.dir, name)
  }
  save(filename, content) {
    const pathFile = path.dirname(filename)
    this.mkdirsSync(pathFile)
    fs.writeFileSync(filename, content)
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
  isExistFile(filename) {
    return fs.existsSync(this.getPathName(filename))
  }
  vmRun(code, opt) {
    const vm = new VM(opt)
    return vm.run(code)
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
}

module.exports = {
  Base
}