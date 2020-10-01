
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
module.exports = {
  type
}