
const { Base } = require('./base')
const { WxCfg } = require('./wx-cfg')
const { WxJs } = require('./wx-js')
const { Wxml } = require('./wx-xml')
const { WxCss } = require('./wx-css')

class Wxapkg extends Base {
  constructor(dir) {
    super(dir)
    // this.dir  // 放在wxapkg同名目录
    // this.filename
  }
  static init(filename) {
    const dir = Wxapkg.getDir(filename)
    return new Wxapkg(dir)
  }
  doFile(filename) {
    this.dir = this.getDir(filename)
    const buf = this.getFileContent(filename, null)
    const [infoListLength, dataLength] = this.header(buf)
    const fileList = this.genList(buf.slice(14, infoListLength + 14))
    this.saveFile(buf, fileList)

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
    console.log("\nHeader info:")
    let firstMark = buf.readUInt8(0)
    console.log("  firstMark: 0x%s", firstMark.toString(16))
    let unknownInfo = buf.readUInt32BE(1)
    console.log("  unknownInfo: ", unknownInfo)
    let infoListLength = buf.readUInt32BE(5)
    console.log("  infoListLength: ", infoListLength)
    let dataLength = buf.readUInt32BE(9)
    console.log("  dataLength: ", dataLength)
    let lastMark = buf.readUInt8(13)
    console.log("  lastMark: 0x%s", lastMark.toString(16))
    if (firstMark != 0xbe || lastMark != 0xed) throw Error("Magic number is not correct!")
    return [infoListLength, dataLength]
  }
  start(filename) {
    // this.doFile(filename)
    this.doConfig('_-1724955099_4\\app-config.json')
  }
  doConfig(filename) {
    const cfg = WxCfg.init(filename)
    cfg.start(filename)
  }
  packDone() {

  }
  genList(buf) {
    console.log("\nFile list info:")
    const fileCount = buf.readUInt32BE(0)
    console.log("  fileCount: ", fileCount)
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
      // console.log(info)
    }
    return fileInfo
  }
}

module.exports = {
  Wxapkg
}