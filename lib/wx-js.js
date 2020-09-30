
const { Base } = require('./base')
// const { js_beautify } = require("js-beautify")
const UglifyJS = require("uglify-es")

class WxJs extends Base {
  constructor(dir, subPack, filename) {
    super(dir)
    this.subPack = subPack
    this.filename = filename
    this.mainDir = subPack ? this.getAbsolutePath(dir, '..') : ''
  }
  static init(dir, root, filename) {
    return new WxJs(dir, root, filename)
  }
  start() {
    this.splitJs()
  }
  splitJs() {
    let code = this.getFileContent(this.getPathName(this.filename))
    const needDelList = {}

    if (this.subPack) code = code.slice(code.indexOf("define("))
    console.log('\nsplitJs: ' + this.filename)
    const dir = this.mainDir || this.dir
    // console.log('dir: ', dir)
    const self = this
    let count = 0
    this.vmRun(code, {
      sandbox: {
        require() { },
        definePlugin() { },
        requirePlugin() { },
        define(name, func) {
          let code = func.toString()
          code = code.slice(code.indexOf("{") + 1, code.lastIndexOf("}") - 1).trim()
          let bcode = code
          if (code.startsWith('"use strict";') || code.startsWith("'use strict';"))
            code = code.slice(13)
          else if ((code.startsWith('(function(){"use strict";')
            || code.startsWith("(function(){'use strict';"))
            && code.endsWith("})();"))
            code = code.slice(25, -5)
          let res = self.jsBeautify(code)
          if (typeof res == "undefined") {
            console.log("Fail to delete 'use strict' in \"" + name + "\".")
            res = self.jsBeautify(bcode)
          }
          // console.log(name)
          const filePath = self.getPathName(name, dir)
          needDelList[filePath] = -8
          self.save(filePath, self.jsBeautify(res))
          count++
        },
      }
    })
    console.log("Splitting done. counts: ", count)
    // if (!needDelList[name]) needDelList[name] = 8
    // return needDelList
  }

  jsBeautify(code) {
    return UglifyJS.minify(code,
      {
        mangle: false, compress: false,
        output: { beautify: true, comments: true }
      }).code
  }
}

module.exports = {
  WxJs
}