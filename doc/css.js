"page-frame.html"
/*v0.6vv_20170919_fbi_wxs*/
// _1531899286_5     css _C is not defined
function setCssToHead(file) {
  css = makeup(file)
  var style = document.createElement('style')
  var head = document.head || document.getElementsByTagName('head')[0]
  style.type = 'text/css'
  if (style.styleSheet) {
    style.styleSheet.cssText = css
  } else {
    style.appendChild(document.createTextNode(css))
  }
  head.appendChild(style)
}

var _C= [[".zan-loadmore..."]]

str=`
function setCssToHead(file) {
css = makeup(file);
var style = document.createElement('style');
var head = document.head || document.getElementsByTagName('head')[0];
style.type = 'text/css';
if (style.styleSheet) {
style.styleSheet.cssText = css;
} else {
style.appendChild(document.createTextNode(css));
}
head.appendChild(style);
}`