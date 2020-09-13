# webpack-config-reload

热加载 webpack 配置。修改 webpack 相关配置文件后，自动重启脚本命令，比如 dev-server，比较方便的是在调试 webpack 繁琐的配置时候，省去一遍遍地 `Ctrl+c` 和重复输入命令。

**注意：只支持 `webpack/webpack-dev-server` 两个命令。**

## 安装与使用

使用 npm 安装：

```bash
$ npm install webpack-config-reload --save-dev
# 或者全局安装
$ npm install -g webpack-config-reload
```

推荐放到 `package.json` 中以执行 npm/yarn 脚本命令：

```json
{
    "scripts": {
        "start": "wc-reload webpack-dev-server --config webpack.config.dev.js",
        "build": "wc-reload webpack -p",
        "watch": "wc-reload npm start"
    }
}
```

```bash
# 命令行中执行
$ npm start
```

有额外的命令的话，比如：`cross-env`。需要把 `wc-reload` 置于 webpack 命令前面：

```json
{
    "build": "cross-env ENV=xxx wc-reload webpack -p"
}
```

全局安装直接在命令行中直接执行：

```bash
$ wc-reload npm start # 禁止俄罗斯套娃
$ wc-reload webpack
$ wc-reload webpack-dev-server --config webpack.config.dev.js
```

> 未检测到 `webpack/webpack-dev-server` 将直接执行用户命令，不会提供热加载功能。比如：`wc-reload gulp`、`wc-reload eslint` 等

## TODO

+ 补写测试
+ 貌似新增的文件没有监听到，待验证
+ 英文版文档（还是算了。。。）
