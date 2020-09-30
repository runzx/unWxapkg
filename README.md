# unWxapkg

学习微信小程序结构.

## ES6 同步设计模式

- 学习 wxappUnpacker 代码，其采用 传统 js 回调+递归，让我头晕脑涨，调试很难，过时就忘记了。
- 故采用 ES6 + async/await + 面向对象重构设计
- 达到易读懂，方便修改的学习目的。

## 进度

1. 可生成基本包文件: app-config.json, app-service.js, page-frame.html, \*.html,
2. 可生成基本包/分包配置文件: app.json, \*.json
3. 可生成基本包/分包 wxss 文件 app.wxss, \*.wxss
4. 可生成基本包 wxml 文件

## 目录结构

```bash
├── lib                # 相关代码
│   ├── base.js         基本库
│   ├── wxapkg.js       主模块，    生成基本分包文件
│   ├── wx-cfg.js       生成xx.json 配置文件
│   ├── wx-js.js        生成xx.js   业务逻辑文件
│   ├── wx-xml.js       生成xx.wxml 显示框架文件
│   └── wx-css.js       生成xx.wxss css文件
│
├── doc                #  相关文档
│   ├── lib.md         用到库 学习要点记录
│   ├── readmd.md      源码 学习要点记录
│   └── wxappUnpacker.md  学习对象原readme
│
└── index.js            # 主入口

```

## 提交规范

- 请注意代码规范（vscode 默认 TypeScript 风格）。

- 提交前请先拉取代码，以免产生不必要的冲突

- 提交规范：`key: value`

- `key` 可选 ：

  ```
  feat：  新功能（feature）
  fix：   修补bug
  docs：  文档（documentation）
  style： 格式（不影响代码运行的变动）
  refactor：重构（即不是新增功能，也不是修改bug的代码变动）
  test：  增加测试
  chore： 构建过程或辅助工具的变动
  release: 发布
  ```

## 说明

- 基于 [wxappUnpacker](https://github.com/qwerty472123/wxappUnpacker 'wxappUnpacker')

- 改进的开源项目。
