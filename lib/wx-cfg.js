
const { Base } = require('./base')

class WxCfg extends Base {
  constructor({ dir }) {
    super({ dir })
  }
  static init(dir) {

    return new WxCfg(dir)
  }
  start() {
    const filename = this.getPathName('app-config.json')
    const content = this.getFileContent(filename)
    const config = JSON.parse(content)
    let { page, pages, global, tabBar, networkTimeout, subPackages,
      navigateToMiniProgramAppIdList, extAppid, debug, ext } = config
    pages = this.goFrist(pages, this.changeExt(config.entryPagePath))
    const app = { pages, window: global && global.window, tabBar, networkTimeout }
    if (subPackages) { app.subPackages = this.getSubPack(subPackages, pages) }
    if (debug !== undefined) { app.debug = debug }
    if (navigateToMiniProgramAppIdList) { app.navigateToMiniProgramAppIdList = navigateToMiniProgramAppIdList }
    if (extAppid) {
      this.saveJson(this.getPathName('ext.json'),
        { extEnable: true, extAppid, ext })
    }
    if (this.isExistFile('workers.js')) app.workers = this.getWorkerPath(this.getPathName('workers.js'))

    this.getUsimgComponents(page, this.getDir("./file"))

    if (this.isExistFile("app-service.js"))
      this.getAppServiceCfg(page)
    this.savePageCfg(page)
    if (app.subPackages) this.saveSubPack(app.subPackages)
    if (app.tabBar && app.tabBar.list) this.doTabBar(app)

    this.saveJson(this.getPathName('app.json'), app)
    return this.delWeight
  }

  doTabBar(app) {
    const li = this.scanDirByExt(this.dir, '')
    const digests = li.map(name => ([this.md5(this.getFileContent(name, null)), name]))
    const rdir = this.getPathName('')
    const fixDir = dir => (dir.startsWith(rdir) ? dir.slice(rdir.length + 1) : dir)
    const go = (data) => {
      if (!data) return
      const hash = this.md5(data)
      const [, name] = digests.find(([buf]) => hash.equals(buf))
      if (name) return fixDir(name).replace(/\\/g, '/')
    }
    let res
    for (const i of app.tabBar.list) {
      i.pagePath = this.changeExt(i.pagePath)
      res = go(i.iconData)
      if (res) {
        i.iconPath = res
        delete i.iconData
      }
      res = go(i.selectedIconData)
      if (res) {
        i.selectedIconPath = res
        delete i.selectedIconData
      }
    }
  }
  saveSubPack(subPackages) {
    for (let subPackage of subPackages) {
      if (subPackage.pages) {
        for (let item of subPackage.pages) {
          const tpl = this.getPathName(subPackage.root + item)
          //添加默认的 wxs, wxml, wxss 空文件
          this.save(tpl + '.js', "// " + subPackage.root + item + "\nPage({data: {}})")
          this.save(tpl + '.wxml', "<!--" + subPackage.root + item + "-->\n<text>" + item + "</text>")
          this.save(tpl + '.wxss', "/* " + subPackage.root + item + " */")
        }
      }
    }
  }
  savePageCfg(page) {
    let count = 0
    for (let key in page) {
      let name = this.prePlugin(key)
      let fileName = this.getPathName(this.changeExt(name, ".json"))
      this.saveJson(fileName, page[key].window)
      count++
    }
    console.log('save *.json counts: %d\n', count)
  }
  getAppServiceCfg(page) {
    let matches = this.getFileContent(this.getPathName("app-service.js"))
      .match(/\_\_wxAppCode\_\_\['[^\.]+\.json[^;]+\;/g)
    if (matches) {
      let attachInfo = {}
      this.vmRun(matches.join(''), {
        sandbox: {
          __wxAppCode__: attachInfo
        }
      })
      for (let name in attachInfo) page[this.changeExt(name, ".html")] = { window: attachInfo[name] }
    }
  }
  getUsimgComponents(page, cur) {
    Object.keys(page).filter(i => page[i].window.usingComponents)
      .forEach(key => {
        const compontents = page[key].window.usingComponents
        Object.keys(compontents)
          .forEach(name => {
            let componentPath = compontents[name] + ".html"
            let file = componentPath.startsWith('/')
              ? componentPath.slice(1)
              : this.toDir(this.getAbsolutePath(this.getFileDir(key), componentPath), cur)
            if (!page[file]) page[file] = {}
            if (!page[file].window) page[file].window = {}
            page[file].window.component = true
          })
      })

    /* 
    for (const key of Object.keys(page))
      if (page[key].window.usingComponents)
        for (let name in page[key].window.usingComponents) {
          let componentPath = page[key].window.usingComponents[name] + ".html"
          let file = componentPath.startsWith('/')
            ? componentPath.slice(1)
            : this.toDir(this.getAbsolutePath(this.getFileDir(key), componentPath), cur)
          if (!page[file]) page[file] = {}
          if (!page[file].window) page[file].window = {}
          page[file].window.component = true
        } 
        */
  }
  getSubPack(subPackages, pages) {
    let subPs = []
    // let pages = app.pages
    for (let subPackage of subPackages) {
      let { root } = subPackage

      if (!root.endsWith('/')) root += '/'
      if (root.startsWith('/')) root = root.substring(1)

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
    console.log("================\n分包个数为: ", subPs.length, "\n================")
    return subPs
  }
  goFrist(arr, item) {
    arr.splice(arr.indexOf(item), 1)
    arr.unshift(item)  // 插入第一位置
    return arr
  }
  saveJson(filename, data) {
    // 缩进4个空格
    return this.save(filename, JSON.stringify(data, null, 4))
  }
}

module.exports = {
  WxCfg
}