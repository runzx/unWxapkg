const fs = require("fs")
const path = require("path")

class Base {
  constructor() {

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
  getExactStoreDir(dir = process.cwd(), ...arg) {
    const extrat = path.isAbsolute(dir)
      ? path.join(dir, ...arg)
      : path.join(process.cwd(), dir, ...arg)
    return extrat
  }
  getName(name) {
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
}

module.exports = {
  Base
}