
const { Base } = require('./base')
const cheerio = require('cheerio')
const cssbeautify = require('cssbeautify')
const csstree = require('css-tree')

class WxCss extends Base {
  constructor(dir, subPack) {
    super(dir)
    this.subPack = subPack

    this.pureData = {}
    this.runList = {}
    this.result = {}
    this.actualPure = {}
    this.importCnt = {}
    this.frameName = ""
    this.blockCss = []
    this.commonStyle = {}
    this.onlyTest = false
    this.saveDir = dir
  }
  static init(dir, root) {
    return new WxCss(dir, root)
  }
  start() {
    console.log("Guess wxss(first turn)...")
    const mainCss = this.getMainCss()
    const files = this.scanDirByExt(this.dir, '.html')
    this.preRun(files)
    this.onlyTest = true
    this.runOnce()
    this.onlyTest = false
    console.log("Import count info: %j", this.importCnt)
    this.preCss()
    console.log("Guess wxss(first turn) done.\nGenerate wxss(second turn)...")
    this.runOnce()
    console.log("Generate wxss(second turn) done.\nSave wxss...")
    console.log('saveDir: ' + this.saveDir)
    this.saveFile()
  }
  saveFile() {
    const { result } = this
    let count = 0
    for (let name in result) {
      let pathFile = this.getPathName(this.changeExt(name, ".wxss"), this.saveDir)
      this.save(pathFile, this.transformCss(result[name]))
      count++
    }
    console.log('save cssFile counts: ', count)
  }
  transformCss(style) {
    let ast = csstree.parse(style)
    csstree.walk(ast, function (node) {
      if (node.type == "Comment") {//Change the comment because the limit of css-tree
        node.type = "Raw"
        node.value = "\n/*" + node.value + "*/\n"
      }
      if (node.type == "TypeSelector") {
        if (node.name.startsWith("wx-")) node.name = node.name.slice(3)
        else if (node.name == "body") node.name = "page"
      }
      if (node.children) {
        const removeType = ["webkit", "moz", "ms", "o"]
        let list = {}
        node.children.each((son, item) => {
          if (son.type == "Declaration") {
            if (list[son.property]) {
              let a = item, b = list[son.property], x = son, y = b.data, ans = null
              if (x.value.type == 'Raw' && x.value.value.startsWith("progid:DXImageTransform")) {
                node.children.remove(a)
                ans = b
              } else if (y.value.type == 'Raw' && y.value.value.startsWith("progid:DXImageTransform")) {
                node.children.remove(b)
                ans = a
              } else {
                let xValue = x.value.children && x.value.children.head && x.value.children.head.data.name,
                  yValue = y.value.children && y.value.children.head && y.value.children.head.data.name
                if (xValue && yValue) for (let type of removeType) if (xValue == `-${type}-${yValue}`) {
                  node.children.remove(a)
                  ans = b
                  break
                } else if (yValue == `-${type}-${xValue}`) {
                  node.children.remove(b)
                  ans = a
                  break
                } else {
                  let mValue = `-${type}-`
                  if (xValue.startsWith(mValue)) xValue = xValue.slice(mValue.length)
                  if (yValue.startsWith(mValue)) yValue = yValue.slice(mValue.length)
                }
                if (ans === null) ans = b
              }
              list[son.property] = ans
            } else list[son.property] = item
          }
        })
        for (let name in list) if (!name.startsWith('-'))
          for (let type of removeType) {
            let fullName = `-${type}-${name}`
            if (list[fullName]) {
              node.children.remove(list[fullName])
              delete list[fullName]
            }
          }
      }
    })
    return cssbeautify(csstree.generate(ast), { indent: '    ', autosemicolon: true })
  }
  preCss() {
    const { result, importCnt, pureData, onlyTest, actualPure,
      blockCss, commonStyle } = this
    for (let id in pureData) {
      if (actualPure[id]) continue
      if (!importCnt[id]) importCnt[id] = 0
      if (importCnt[id] <= 1)
        console.log("Cannot find pure import for _C[" + id + "] which is only imported " + importCnt[id] + " times. Let importing become copying.")
      else {
        let newFile = this.getPathName("__wuBaseWxss__/" + id + ".wxss", this.saveDir)
        console.log("Cannot find pure import for _C[" + id + "], force to save it in (" + newFile + ").")
        id = Number.parseInt(id)
        actualPure[id] = newFile
        this.callCssRebuild(id, newFile)
      }
    }
  }
  preRun(files) {
    for (const name of files) {
      if (name === this.frameFile) continue
      let code = this.getFileContent(name)
      code = code.replace(/display:-webkit-box;display:-webkit-flex;/gm, '')
      code = code.slice(0, code.indexOf("\n"))
      if (code.includes("setCssToHead(")) {
        let lastName = name
        let dirSplit = name.split(nowDir + '/')
        if (dirSplit.length > 1) {
          lastName = path.resolve(saveDir, dirSplit[1])
        }
        this.runList[lastName] = code.slice(code.indexOf("setCssToHead("))
      }
    }
  }
  getMainCss() {
    const frameFile = ["page-frame.html", "app-wxss.js", "page-frame.js"].find(i =>
      this.isExistFile(i))
    this.frameFile = this.getPathName(frameFile)
    if (!frameFile) throw new Error('page-frame-like file is not found!')

    let code = this.getFileContent(this.frameFile)
    let scriptCode = this.preHtml(frameFile, code)

    const window = { screen: { width: 720, height: 1028, orientation: { type: 'vertical' } } }
    const navigator = { userAgent: "iPhone" }
    scriptCode = scriptCode.slice(scriptCode.lastIndexOf('window.__wcc_version__'))

    let mainCode = `window=${JSON.stringify(window)};
navigator=${JSON.stringify(navigator)};
var __mainPageFrameReady__ = window.__mainPageFrameReady__ || function(){};var __WXML_GLOBAL__={entrys:{},defines:{},modules:{},ops:[],wxs_nf_init:undefined,total_ops:0};var __vd_version_info__=__vd_version_info__||{};
${scriptCode}`

    if (code.includes('__COMMON_STYLESHEETS__')) {
      let commonStyles = code.slice(
        code.indexOf('__COMMON_STYLESHEETS__||{}') + 26,
        code.indexOf('var setCssToHead = function(file, _xcInvalid, info)')
      )
      commonStyles =
        ';var __COMMON_STYLESHEETS__ = __COMMON_STYLESHEETS__||{};' +
        commonStyles +
        ';__COMMON_STYLESHEETS__;'
      this.commonStyle = this.vmRun(commonStyles)

    }

    mainCode = mainCode.replace('var setCssToHead = function', 'var setCssToHead2 = function')
    code = code.slice(code.lastIndexOf('var setCssToHead = function(file, _xcInvalid'))
    code = code.replace('__COMMON_STYLESHEETS__', '[]')
    if (code.includes('_C =')) code = code.slice(code.lastIndexOf('\nvar _C =') + 1)
    else code = code.slice(code.lastIndexOf('\nvar _C=') + 1)
    code = code.slice(0, code.indexOf('\n'))

    this.pureData = this.vmRun(code + '\n_C', { sandbox: {} })

    this.runList[this.getPathName("app.wxss")] = mainCode
    return mainCode
  }

  preHtml(file, code) {
    code = code.replace(/display:-webkit-box;display:-webkit-flex;/gm, '')
    if (!file.endsWith('.html')) return code
    const $ = cheerio.load(code)
    try {
      let scripts = $('html')
        .find('script')
        .map(function (idx, el) {
          return $(this).html()
        })
      return scripts.get().join('\n')
    } catch (e) { }
  }

  runOnce() {
    Object.keys(this.runList)
      .forEach(key => this.runVM(key, this.runList[key]))
  }
  runVM(cssFile, code) {
    const wxAppCode = {}
    const GwxCfg = { $gwx() { } }
    for (let i = 0; i < 300; i++)
      GwxCfg['$gwx' + i] = GwxCfg.$gwx

    this.vmRun(code, {
      sandbox: {
        ...GwxCfg,
        __wxAppCode__: wxAppCode,
        setCssToHead: (data) => {
          return () => {
            this.callCssRebuile(data, cssFile)
          }
        },
      }
    })

    for (let name in wxAppCode) {
      cssFile = this.getPathName(name)
      if (name.endsWith(".wxss")) {
        wxAppCode[name]()
      }
    }
  }
  callCssRebuile(data, cssFile) {
    const { result } = this
    if (!result[cssFile]) result[cssFile] = ""
    result[cssFile] += this.cssRebuild(data, cssFile)
  }
  cssRebuild(data, cssFile) {
    const { result, importCnt, pureData, onlyTest, actualPure,
      blockCss, commonStyle } = this

    const statistic = (data) => {
      const addStat = (id) => {
        if (!importCnt[id]) importCnt[id] = 1, statistic(pureData[id])
        else ++importCnt[id]
      }

      if (typeof data === "number") return addStat(data)
      if (data != undefined) {
        for (let content of data) if (typeof content === "object" && content[0] == 2) addStat(content[1])
      }
    }
    const makeup = (data) => {
      const isPure = typeof data === "number"
      if (onlyTest) {
        statistic(data)
        if (!isPure) {
          if (data.length == 1 && data[0][0] == 2) data = data[0][1]
          else return ""
        }
        if (!actualPure[data] && !blockCss.includes(this.changeExt(this.toDir(cssFile, frameName), ""))) {
          console.log("Regard " + cssFile + " as pure import file.")
          actualPure[data] = cssFile
        }
        return ""
      }
      let res = [], attach = ""
      if (isPure && actualPure[data] != cssFile) {
        if (actualPure[data]) return '@import "' + wu.changeExt(wu.toDir(actualPure[data], cssFile), ".wxss") + '";\n'
        else {
          res.push("/*! Import by _C[" + data + "], whose real path we cannot found. */")
          attach = "/*! Import end */"
        }
      }
      let exactData = isPure ? pureData[data] : data
      if (typeof data === 'string') {
        let styleData = commonStyle[data]
        let fileStyle = ''
        if (styleData != undefined) {
          for (let content of styleData) {
            if (typeof content === 'string') {
              if (content != '1') {
                fileStyle += content
              }
            } else {
              if (content.length != 1) {
                fileStyle += content[1] + 'rpx'
              }
            }
          }
        }
        exactData = fileStyle
      }
      for (let content of exactData)
        if (typeof content === "object") {
          switch (content[0]) {
            case 0://rpx
              res.push(content[1] + "rpx")
              break
            case 1://add suffix, ignore it for restoring correct!
              break
            case 2://import
              res.push(makeup(content[1]))
              break
          }
        } else res.push(content)
      return res.join("") + attach
    }

    return makeup(data)
  }
}

module.exports = {
  WxCss
}