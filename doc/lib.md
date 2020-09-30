# 所用库清单

### cheerio

是 jquery 核心功能的一个快速灵活而又简洁的实现，主要是为了用在服务器端需要对 DOM 进行操作的地方
cheerio 实现了 jQuery 的一个子集，去掉了 jQuery 中所有与 DOM 不一致或者是用来填浏览器的坑的东西

```js
// 我们要手动加载我们的HTML文档
var cheerio = require('cheerio'),
  $ = cheerio.load('<ul id = "fruits">...</ul>')

$('#fruits').find('li').length
$('.pear').parent().attr('id')
$('.apple').next().hasClass('orange')
$('.pear').siblings().length // 第一个元素的所有兄弟元素，不包含它自己
$('li').each(function (i, elem) {
  fruits[i] = $(this).text()
})
$('li')
  .map(function (i, el) {
    // this === el
    return $(this).attr('class')
  })
  .get()
  .join(', ')

$('li').filter('.orange').attr('class')
```
