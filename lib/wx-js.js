
const { Base } = require('./base')

class WxJs extends Base {
  constructor() {
    super()
    // this.dir  // 放在wxapkg同名目录
    this.filename
  }
  static init(dir, root) {

    return new WxJs(dir, root)
  }
}

module.exports = {
  WxJs
}