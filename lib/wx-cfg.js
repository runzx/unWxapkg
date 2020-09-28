
const { Base } = require('./base')

class WxCfg extends Base {
  constructor(dir) {
    super(dir)

    this.filename
  }
  static init(filename) {
    const dir = WxCfg.getDir(filename, '.json')
    return new WxCfg(dir)
  }
  start(filename) {
    const content = this.getFileContent(filename)
    const config = JSON.parse(content)
    let { page, pages, global, tabBar, networkTimeout, subPackages,
      navigateToMiniProgramAppIdList, extAppid, debug, ext } = config
    pages = this.goFrist(pages, this.changeExt(config.entryPagePath))
    const app = { pages, window: global && global.window, tabBar, networkTimeout }
    if (subPackages) { app.subPackages = this.getSubPack(subPackages, pages) }
    if (!debug) { app.debug = e.debug }
    if (navigateToMiniProgramAppIdList) { app.navigateToMiniProgramAppIdList = e.navigateToMiniProgramAppIdList }
    if (extAppid) {
      this.save(this.getPathName('ext.json'), JSON.stringify({
        extEnable: true,
        extAppid, ext
      }, null, 4))  // 缩进4个空格
    }
    if (this.isExistFile('workers.js')) app.workers = this.getWorkerPath(this.getPathName('workers.js'))
    if (this.isExistFile("app-service.js")) {
      let matches = this.getFileContent(this.getPathName("app-service.js"))
        .match(/\_\_wxAppCode\_\_\['[^\.]+\.json[^;]+\;/g)
      if (matches) {
        let attachInfo = {}
        this.vmRun(matches.join(''), {
          sandbox: {
            __wxAppCode__: attachInfo
          }
        })
        // (new VM({
        //   sandbox: {
        //     __wxAppCode__: attachInfo
        //   }
        // })).run(matches.join(""))
        for (let name in attachInfo) page[this.changeExt(name, ".html")] = { window: attachInfo[name] }
      }
    }
  }

  getSubPack(subPackages, pages) {
    let subPs = []
    // let pages = app.pages
    for (let subPackage of subPackages) {
      let { root } = subPackage
      let lastChar = root.substr(root.length - 1, 1)
      if (lastChar !== '/') {
        root = root + '/'
      }
      let firstChar = root.substr(0, 1)
      if (firstChar === '/') {
        root = root.substring(1)
      }
      let newPages = []
      for (let page of subPackage.pages) {
        let items = page.replace(root, '')
        newPages.push(items)
        let subIndex = pages.indexOf(root + items)
        if (subIndex !== -1) {
          pages.splice(subIndex, 1)
        }
      }
      subPackage.root = root
      subPackage.pages = newPages
      subPs.push(subPackage)
    }
    // app.subPackages = subPs
    // app.pages = pages
    console.log("==============\n这个小程序采用了分包\n子包个数为: ", app.subPackages.length, "\n================")
    return subPs
  }
  goFrist(arr, item) {
    arr.splice(arr.indexOf(item), 1)
    arr.unshift(item)  // 插入第一位置
    return arr
  }
}

module.exports = {
  WxCfg
}