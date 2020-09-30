
// const { Base } = require('./base')
const { WxZ } = require('./wx-restore-z')
const { js_beautify } = require("js-beautify")
const esprima = require('esprima')
const escodegen = require('escodegen')

class Wxml extends WxZ {
  constructor(dir, subPack, filename, moreInfo = false) {
    super(dir)
    this.subPack = subPack
    this.filename = filename
    this.mainDir = ''
    this.moreInfo = moreInfo
  }
  static init(dir, root, filename, moreInfo) {
    return new Wxml(dir, root, filename, moreInfo)
  }
  start() {
    const [z, d_, e_, f_, x, requireInfo] = this.preZ()
    const wxsList = this.saveWxs(f_, requireInfo)
    this.tryWxml(z, d_, e_, wxsList, x)
  }
  preZ() {
    let code = this.getFileContent(this.getPathName(this.filename))
    let z = this.getZ(code)
    const before = "\nvar nv_require=function(){var nnm="
    code = code.slice(code.lastIndexOf(before) + before.length, code.lastIndexOf("if(path&&e_[path]){"))
    let json = code.slice(0, code.indexOf("};") + 1)
    let endOfRequire = code.indexOf("()\r\n") + 4
    if (endOfRequire == 4 - 1) endOfRequire = code.indexOf("()\n") + 3
    code = code.slice(endOfRequire)
    let d_ = {}, e_ = {}, f_ = {}, requireInfo = {}, x
    let vmCode = code + "\n_vmRev_([x," + json + "])"
    this.vmRun(vmCode, {
      sandbox: {
        d_, e_, f_,
        _vmRev_(data) { [x, requireInfo] = data },
        nv_require(path) { return () => path }
      }
    })
    return [z, d_, e_, f_, x, requireInfo]
  }
  saveWxs(f_, requireInfo) {
    const dir = this.mainDir || this.dir
    const pF = {}
    const wxsList = {}
    Object.keys(f_).filter(key => typeof f_[key] === 'function')
      .forEach(info => {
        const name = this.getPathName((info[0] == '/' ? '.' : '') + info, dir)
        const ref = f_[info]()
        pF[ref] = info
        this.save(name, this.fmtWxs(requireInfo[ref].toString(), info))
      })
    Object.keys(f_).filter(key => typeof f_[key] === 'object')
      .forEach(info => {
        const name = this.getPathName((info[0] == '/' ? '.' : '') + info, dir)
        const res = []
        const now = f_[info]
        Object.keys(now).forEach(deps => {
          let ref = now[deps]()
          if (ref.includes(":"))
            res.push("<wxs module=\"" + deps + "\">\n" +
              this.doWxs(requireInfo[ref].toString()) + "\n</wxs>")
          else if (pF[ref]) res.push("<wxs module=\"" + deps
            + "\" src=\"" + this.toDir(pF[ref], info) + "\" />")
          else res.push("<wxs module=\"" + deps + "\" src=\""
            + this.toDir(ref.slice(2), info) + "\" />")
          wxsList[name] = res.join("\n")
        })
      })
    return wxsList
  }
  fmtWxs(code, name) {
    name = name || ''
    name = name.substring(0, name.lastIndexOf('/') + 1)
    const before = 'nv_module={nv_exports:{}};'
    return js_beautify(code.slice(code.indexOf(before) + before.length,
      code.lastIndexOf('return nv_module.nv_exports;}'))
      .replace(
        eval('/' + ('p_' + name).replace(/\//g, '\\/') + '/g'), '')
      .replace(/nv\_/g, '')
      .replace(/(require\(.*?\))\(\)/g, '$1'))
  }
  tryWxml(z, d_, e_, wxsList, xPool) {
    const files = Object.keys(e_)
    console.log("Decompile files: ", files.length)
    files.forEach(name => {
      let state = [null]
      const rDs = d_[name]
      const code = e_[name].f.toString()
      // console.log("Decompile " + name + "...")
      try {
        this.doWxml(state, name, code, z, xPool, rDs, wxsList,)
        // console.log("Decompile success!")
      } catch (e) {
        console.log("error on " + name + "(" + (state[0] === null ? "Main" : "Template-" + state[0]) + ")\nerr: ", e)
        if (state[0] === null) this.save(this.getPathName(name + ".ori.js"), code)
        else this.save(this.getPathName(name + ".tem-" + state[0] + ".ori.js"),
          rDs[state[0]].toString())
      }
    })
  }
  wxmlify(str, isText) {
    if (typeof str == "undefined" || str === null)
      return "Empty"//throw Error("Empty str in "+(isText?"text":"prop"));
    if (isText) return str//may have some bugs in some specific case(undocumented by tx)
    else return str.replace(/"/g, '\\"')
  }

  doWxml(state, name, code, z, xPool, rDs, wxsList, moreInfo = this.moreInfo) {
    let rname = code.slice(code.lastIndexOf("return") + 6).replace(/[\;\}]/g, "").trim()
    code = code.slice(code.indexOf("\n"), code.lastIndexOf("return")).trim()
    let r = { son: [] }
    this.analyze(esprima.parseScript(code).body, z, { [rname]: r }, xPool, { [rname]: r })
    let ans = []
    for (let elem of r.son) ans.push(this.elemToString(elem, 0, moreInfo))
    let result = [ans.join("")]
    for (let v in rDs) {
      state[0] = v
      let oriCode = rDs[v].toString()
      let rname = oriCode.slice(oriCode.lastIndexOf("return") + 6).replace(/[\;\}]/g, "").trim()
      let tryPtr = oriCode.indexOf("\ntry{")
      let zPtr = oriCode.indexOf("var z=gz$gwx")
      let code = oriCode.slice(tryPtr + 5, oriCode.lastIndexOf("\n}catch(")).trim()
      if (zPtr != -1 && tryPtr > zPtr) {
        let attach = oriCode.slice(zPtr)
        attach = attach.slice(0, attach.indexOf("()")) + "()\n"
        code = attach + code
      }
      let r = { tag: "template", v: { name: v }, son: [] }
      this.analyze(esprima.parseScript(code).body, z, { [rname]: r }, xPool, { [rname]: r })
      result.unshift(this.elemToString(r, 0, moreInfo))
    }
    name = this.getPathName(name)
    if (wxsList[name]) result.push(wxsList[name])
    this.save(name, result.join(""))
  }
  elemToString(elem, dep, moreInfo = false) {
    const longerList = []//put tag name which can't be <x /> style.
    const indent = ' '.repeat(4)
    const self = this

    function isTextTag(elem) {
      return elem.tag == "__textNode__" && elem.textNode
    }

    function elemRecursion(elem, dep) {
      return self.elemToString(elem, dep, moreInfo)
    }

    function trimMerge(rets) {
      let needTrimLeft = false, ans = ""
      for (let ret of rets) {
        if (ret.textNode == 1) {
          if (!needTrimLeft) {
            needTrimLeft = true
            ans = ans.trimRight()
          }
        } else if (needTrimLeft) {
          needTrimLeft = false
          ret = ret.trimLeft()
        }
        ans += ret
      }
      return ans
    }

    if (isTextTag(elem)) {
      //In comment, you can use typify text node, which beautify its code, but may destroy ui.
      //So, we use a "hack" way to solve this problem by letting typify program stop when face textNode
      let str = new String(this.wxmlify(elem.content, true))
      str.textNode = 1
      return this.wxmlify(str, true)//indent.repeat(dep)+this.wxmlify(elem.content.trim(),true)+"\n";
    }
    if (elem.tag == "block" && !moreInfo) {
      if (elem.son.length == 1 && !isTextTag(elem.son[0])) {
        let ok = true, s = elem.son[0]
        for (let x in elem.v) if (x in s.v) {
          ok = false
          break
        }
        if (ok && !(("wx:for" in s.v || "wx:if" in s.v) && ("wx:if" in elem.v || "wx:else" in elem.v || "wx:elif" in elem.v))) {//if for and if in one tag, the default result is an if in for. And we should block if nested in elif/else been combined.
          Object.assign(s.v, elem.v)
          return elemRecursion(s, dep)
        }
      } else if (Object.keys(elem.v).length == 0) {
        let ret = []
        for (let s of elem.son) ret.push(elemRecursion(s, dep))
        return trimMerge(ret)
      }
    }
    let ret = indent.repeat(dep) + "<" + elem.tag
    for (let v in elem.v) ret += " " + v + (elem.v[v] !== null ? "=\"" + this.wxmlify(elem.v[v]) + "\"" : "")
    if (elem.son.length == 0) {
      if (longerList.includes(elem.tag)) return ret + " />\n"
      else return ret + "></" + elem.tag + ">\n"
    }
    ret += ">\n"
    let rets = [ret]
    for (let s of elem.son) rets.push(elemRecursion(s, dep + 1))
    rets.push(indent.repeat(dep) + "</" + elem.tag + ">\n")
    return trimMerge(rets)
  }
  analyze(core, z, namePool, xPool, fakePool = {}, zMulName = "0") {
    const self = this
    function anaRecursion(core, fakePool = {}) {
      return self.analyze(core, z, namePool, xPool, fakePool, zMulName)
    }

    function push(name, elem) {
      namePool[name] = elem
    }

    function pushSon(pname, son) {
      if (fakePool[pname]) fakePool[pname].son.push(son)
      else namePool[pname].son.push(son)
    }

    for (let ei = 0; ei < core.length; ei++) {
      let e = core[ei]
      switch (e.type) {
        case "ExpressionStatement": {
          let f = e.expression
          if (f.callee) {
            if (f.callee.type == "Identifier") {
              switch (f.callee.name) {
                case "_r":
                  namePool[f.arguments[0].name].v[f.arguments[1].value] = z[f.arguments[2].value]
                  break
                case "_rz":
                  namePool[f.arguments[1].name].v[f.arguments[2].value] = z.mul[zMulName][f.arguments[3].value]
                  break
                case "_":
                  pushSon(f.arguments[0].name, namePool[f.arguments[1].name])
                  break
                case "_2": {
                  let item = f.arguments[6].value//def:item
                  let index = f.arguments[7].value//def:index
                  let data = z[f.arguments[0].value]
                  let key = escodegen.generate(f.arguments[8]).slice(1, -1)//f.arguments[8].value;//def:""
                  let obj = namePool[f.arguments[5].name]
                  let gen = namePool[f.arguments[1].name]
                  if (gen.tag == "gen") {
                    let ret = gen.func.body.body.pop().argument.name
                    anaRecursion(gen.func.body.body, { [ret]: obj })
                  }
                  obj.v["wx:for"] = data
                  if (index != "index") obj.v["wx:for-index"] = index
                  if (item != "item") obj.v["wx:for-item"] = item
                  if (key != "") obj.v["wx:key"] = key
                }
                  break
                case "_2z": {
                  let item = f.arguments[7].value//def:item
                  let index = f.arguments[8].value//def:index
                  let data = z.mul[zMulName][f.arguments[1].value]
                  let key = escodegen.generate(f.arguments[9]).slice(1, -1)//f.arguments[9].value;//def:""
                  let obj = namePool[f.arguments[6].name]
                  let gen = namePool[f.arguments[2].name]
                  if (gen.tag == "gen") {
                    let ret = gen.func.body.body.pop().argument.name
                    anaRecursion(gen.func.body.body, { [ret]: obj })
                  }
                  obj.v["wx:for"] = data
                  if (index != "index") obj.v["wx:for-index"] = index
                  if (item != "item") obj.v["wx:for-item"] = item
                  if (key != "") obj.v["wx:key"] = key
                }
                  break
                case "_ic":
                  pushSon(f.arguments[5].name, {
                    tag: "include",
                    son: [],
                    v: { src: xPool[f.arguments[0].property.value] }
                  })
                  break
                case "_ai": {//template import
                  let to = Object.keys(fakePool)[0]
                  if (to) pushSon(to, {
                    tag: "import",
                    son: [],
                    v: { src: xPool[f.arguments[1].property.value] }
                  })
                  else throw Error("Unexpected fake pool")
                }
                  break
                case "_af":
                  //ignore _af
                  break
                default:
                  throw Error("Unknown expression callee name " + f.callee.name)
              }
            } else if (f.callee.type == "MemberExpression") {
              if (f.callee.object.name == "cs" || f.callee.property.name == "pop") break
              throw Error("Unknown member expression")
            } else throw Error("Unknown callee type " + f.callee.type)
          } else if (f.type == "AssignmentExpression" && f.operator == "=") {
            //no special use
          } else throw Error("Unknown expression statement.")
          break
        }
        case "VariableDeclaration":
          for (let dec of e.declarations) {
            if (dec.init.type == "CallExpression") {
              switch (dec.init.callee.name) {
                case "_n":
                  push(dec.id.name, { tag: dec.init.arguments[0].value, son: [], v: {} })
                  break
                case "_v":
                  push(dec.id.name, { tag: "block", son: [], v: {} })
                  break
                case "_o":
                  push(dec.id.name, {
                    tag: "__textNode__",
                    textNode: true,
                    content: z[dec.init.arguments[0].value]
                  })
                  break
                case "_oz":
                  push(dec.id.name, {
                    tag: "__textNode__",
                    textNode: true,
                    content: z.mul[zMulName][dec.init.arguments[1].value]
                  })
                  break
                case "_m": {
                  if (dec.init.arguments[2].elements.length > 0)
                    throw Error("Noticable generics content: " + dec.init.arguments[2].toString())
                  let mv = {}
                  let name = null, base = 0
                  for (let x of dec.init.arguments[1].elements) {
                    let v = x.value
                    if (!v && typeof v != "number") {
                      if (x.type == "UnaryExpression" && x.operator == "-") v = -x.argument.value
                      else throw Error("Unknown type of object in _m attrs array: " + x.type)
                    }
                    if (name === null) {
                      name = v
                    } else {
                      if (base + v < 0) mv[name] = null; else {
                        mv[name] = z[base + v]
                        if (base == 0) base = v
                      }
                      name = null
                    }
                  }
                  push(dec.id.name, { tag: dec.init.arguments[0].value, son: [], v: mv })
                }
                  break
                case "_mz": {
                  if (dec.init.arguments[3].elements.length > 0)
                    throw Error("Noticable generics content: " + dec.init.arguments[3].toString())
                  let mv = {}
                  let name = null, base = 0
                  for (let x of dec.init.arguments[2].elements) {
                    let v = x.value
                    if (!v && typeof v != "number") {
                      if (x.type == "UnaryExpression" && x.operator == "-") v = -x.argument.value
                      else throw Error("Unknown type of object in _mz attrs array: " + x.type)
                    }
                    if (name === null) {
                      name = v
                    } else {
                      if (base + v < 0) mv[name] = null; else {
                        mv[name] = z.mul[zMulName][base + v]
                        if (base == 0) base = v
                      }
                      name = null
                    }
                  }
                  push(dec.id.name, { tag: dec.init.arguments[1].value, son: [], v: mv })
                }
                  break
                case "_gd"://template use/is
                  {
                    let is = namePool[dec.init.arguments[1].name].content
                    let data = null, obj = null
                    ei++
                    for (let e of core[ei].consequent.body) {
                      if (e.type == "VariableDeclaration") {
                        for (let f of e.declarations) {
                          if (f.init.type == "LogicalExpression" && f.init.left.type == "CallExpression") {
                            if (f.init.left.callee.name == "_1") data = z[f.init.left.arguments[0].value]
                            else if (f.init.left.callee.name == "_1z") data = z.mul[zMulName][f.init.left.arguments[1].value]
                          }
                        }
                      } else if (e.type == "ExpressionStatement") {
                        let f = e.expression
                        if (f.type == "AssignmentExpression" && f.operator == "=" && f.left.property && f.left.property.name == "wxXCkey") {
                          obj = f.left.object.name
                        }
                      }
                    }
                    namePool[obj].tag = "template"
                    Object.assign(namePool[obj].v, { is: is, data: data })
                  }
                  break
                default: {
                  let funName = dec.init.callee.name
                  if (funName.startsWith("gz$gwx")) {
                    zMulName = funName.slice(6)
                  } else throw Error("Unknown init callee " + funName)
                }
              }
            } else if (dec.init.type == "FunctionExpression") {
              push(dec.id.name, { tag: "gen", func: dec.init })
            } else if (dec.init.type == "MemberExpression") {
              if (dec.init.object.type == "MemberExpression" && dec.init.object.object.name == "e_" && dec.init.object.property.type == "MemberExpression" && dec.init.object.property.object.name == "x") {
                if (dec.init.property.name == "j") {//include
                  //do nothing
                } else if (dec.init.property.name == "i") {//import
                  //do nothing
                } else throw Error("Unknown member expression declaration.")
              } else throw Error("Unknown member expression declaration.")
            } else throw Error("Unknown declaration init type " + dec.init.type)
          }
          break
        case "IfStatement":
          if (e.test.callee.name.startsWith("_o")) {
            function parse_OFun(e) {
              if (e.test.callee.name == "_o") return z[e.test.arguments[0].value]
              else if (e.test.callee.name == "_oz") return z.mul[zMulName][e.test.arguments[1].value]
              else throw Error("Unknown if statement test callee name:" + e.test.callee.name)
            }

            let vname = e.consequent.body[0].expression.left.object.name
            let nif = { tag: "block", v: { "wx:if": parse_OFun(e) }, son: [] }
            anaRecursion(e.consequent.body, { [vname]: nif })
            pushSon(vname, nif)
            if (e.alternate) {
              while (e.alternate && e.alternate.type == "IfStatement") {
                e = e.alternate
                nif = { tag: "block", v: { "wx:elif": parse_OFun(e) }, son: [] }
                anaRecursion(e.consequent.body, { [vname]: nif })
                pushSon(vname, nif)
              }
              if (e.alternate && e.alternate.type == "BlockStatement") {
                e = e.alternate
                nif = { tag: "block", v: { "wx:else": null }, son: [] }
                anaRecursion(e.body, { [vname]: nif })
                pushSon(vname, nif)
              }
            }
          } else throw Error("Unknown if statement.")
          break
        default:
          throw Error("Unknown type " + e.type)
      }
    }
  }
}

module.exports = {
  Wxml
}