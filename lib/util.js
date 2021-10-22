
// null, undefined, object, array, string, number, boolen, 
// function, regexp, map, set, symbol, blob,  
const type = (o) => {
  var s = Object.prototype.toString.call(o)
  return s.match(/\[object (.*?)\]/)[1].toLowerCase()
}

const action = (obj) => {
  const actions = new Map([
    ['undefined', () => { }],
    ['null', () => { }],
    ['regexp', () => { }],
    ['array', () => { }],
    ['object', () => { }],
    ['string', () => { }],
    ['default', () => { }],
    ['arrau', () => { }],
  ])
  return actions.get(type(obj))()
}

const actions = () => {
  const functionA = () => {/*do sth*/ }
  const functionB = () => {/*do sth*/ }
  return new Map([
    [{ identity: 'guest', status: 1 }, functionA],
    [{ identity: 'guest', status: 2 }, functionA],
    [{ identity: 'guest', status: 3 }, functionA],
    [{ identity: 'guest', status: 4 }, functionA],
    [{ identity: 'guest', status: 5 }, functionB],
    //...
  ])
}

const onButtonClick = (identity, status) => {
  let action = [...actions()].filter(([key, value]) => (key.identity == identity && key.status == status))
  action.forEach(([key, value]) => value.call(this))
}

const actions = () => {
  const functionA = () => {/*do sth*/ }
  const functionB = () => {/*do sth*/ }
  const functionC = () => {/*send log*/ }
  return new Map([
    [/^guest_[1-4]$/, functionA],
    [/^guest_5$/, functionB],
    [/^guest_.*$/, functionC],
    //...
  ])
}

const onButtonClick = (identity, status) => {
  let action = [...actions()].filter(([key, value]) => (key.test(`${identity}_${status}`)))
  action.forEach(([key, value]) => value.call(this))
}

// 利用对象结构判断状态
let state = {
  1: 'success',
  2: 'error',
  3: 'unknown'
}
function foo(code) {
  return state[code]
}

// 二维及多维数组展开
let a = [1, 2, [3, 4]]
a = [].concat(...a) //  [1, 2, 3, 4]
// 数组去重
Array.from(new Set(numList))
return [...new Set(numList)]

// 使用 reduce 代替 filter + map
const arr = [{ sex: 1, age: 10 }, { sex: 1, age: 19 }, { sex: 0, age: 12 }]

let result = arr.reduce((list, item) => {
  item.sex === 1 && list.push({ sex: '男', age: item.agt > 18 ? '成年' : '未成年' })
  return list
}, [])
result = arr.filter(i => i.sex === 1)
  .map(j => ({ sex: '男', age: j.agt > 18 ? '成年' : '未成年' }))
// result: [{ sex: '男', age: "未成年" }, { sex: '男', age: "未成年" }]

module.exports = {
  type
}