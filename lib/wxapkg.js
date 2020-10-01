
const { Base } = require('./base')
const { WxCfg } = require('./wx-cfg')
const { WxJs } = require('./wx-js')
const { Wxml } = require('./wx-xml')
const { WxCss } = require('./wx-css')

class Wxapkg extends Base {
  constructor({ dir, root = '', filename = '', moreInfo = false } = {}) {
    super({ dir, root, filename, moreInfo })
    this.subPack = root
  }
  static init(argv) {
    const filename = argv.d
    const dir = argv.s ? Wxapkg.getDir(argv.s) : Wxapkg.getDir(filename)
    const root = argv.s
    const moreInfo = argv.m ? true : false
    return new Wxapkg({ dir, root, filename, moreInfo })
  }
  doFile() {
    const [buf, fileList] = this.preRead()
    console.log('\n-------------- apkg: %s --------------', this.filename)
    this.subPack && console.log("root: %s\n", this.subPack)
    console.log("All apkg files list info: %d", fileList.length)
    this.saveFile(buf, fileList)
  }
  preRead() {
    const buf = this.getFileContent(this.filename, null)
    const [infoListLength, dataLength] = this.header(buf)
    const fileList = this.genList(buf.slice(14, infoListLength + 14))
    return [buf, fileList]
  }
  saveFile(buf, list) {
    for (const info of list) {
      const filename = this.getPathName((info.name.startsWith("/") ? "." : "") + info.name)
      const content = buf.slice(info.off, info.off + info.size)
      this.save(filename, content)
      this.getExactStoreDir(this.dir, info.name)
    }
  }
  header(buf) {
    // console.log("\nHeader info:")
    let firstMark = buf.readUInt8(0)
    // console.log("  firstMark: 0x%s", firstMark.toString(16))
    let unknownInfo = buf.readUInt32BE(1)
    // console.log("  unknownInfo: ", unknownInfo)
    let infoListLength = buf.readUInt32BE(5)
    // console.log("  infoListLength: ", infoListLength)
    let dataLength = buf.readUInt32BE(9)
    // console.log("  dataLength: ", dataLength)
    let lastMark = buf.readUInt8(13)
    // console.log("  lastMark: 0x%s", lastMark.toString(16))
    if (firstMark != 0xbe || lastMark != 0xed) throw Error("Magic number is not correct!")
    return [infoListLength, dataLength]
  }
  start() {
    this.doFile()
    if (!this.subPack)
      this.doConfig()
    this.doCss()
    this.doXml()
    this.doJs()
  }
  doXml() {
    const root = this.getSubRoot()
    const dir = root ? this.getPathName(root) : this.dir
    let filename = root ? 'page-frame.js' : 'page-frame.html'

    if (!this.isExistFile(filename, dir)) {
      if (root) return

      if (!this.isExistFile('app-wxss.js', dir)) throw new Error('page-frame-like file is not found!')
      filename = 'app-wxss.js'
    }
    Wxml.init({
      dir, mainDir: this.dir, root,
      filename, moreInfo: this.moreInfo
    }).start()
  }
  doConfig() {
    console.log('\nstart config file ...\n',)
    WxCfg.init({ dir: this.dir }).start()
  }
  doCss() {
    const root = this.getSubRoot()
    const dir = root ? this.getPathName(root) : this.dir
    WxCss.init({
      dir, mainDir: this.dir, root,
      moreInfo: this.moreInfo
    }).start()
  }
  doJs() {
    const root = this.getSubRoot()
    const dir = root ? this.getPathName(root) : this.dir
    return ['app-service.js', 'workers.js']
      .filter(filename => this.isExistFile(filename, dir))
      .forEach(filename => WxJs.init({
        dir, mainDir: this.dir, root,
        filename, moreInfo: this.moreInfo
      }).start())
  }
  getSubRoot() {
    if (!this.subPack) return null
    const [, fileList] = this.preRead()
    const file = fileList.find(i => i.name.includes('app-service.js'))
    if (!file) throw new Error('dont find app-service.js !!')
    let workDir = this.getFileDir(file.name)
    return workDir.startsWith('/') ? workDir.slice(1) : workDir
  }

  genList(buf) {
    const fileCount = buf.readUInt32BE(0)
    const fileInfo = []
    let off = 4
    for (let i = 0; i < fileCount; i++) {
      let info = {}
      let nameLen = buf.readUInt32BE(off)
      off += 4
      info.name = buf.toString('utf8', off, off + nameLen)
      off += nameLen
      info.off = buf.readUInt32BE(off)
      off += 4
      info.size = buf.readUInt32BE(off)
      off += 4
      fileInfo.push(info)
    }
    // this.preFilename(fileInfo)
    return fileInfo
  }
}

module.exports = {
  Wxapkg
}