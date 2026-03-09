# MedAnalyzer

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## 打包单文件 EXE（无 npm 环境可运行）

在开发机（有 Node/npm）执行：

```sh
npm run build:exe
```

生成文件：

- `release/MedAnalyzerDeploy.exe`

将该 `exe` 分发给目标用户后，用户双击即可完成：

1. 自动解包并部署前端静态资源到本机目录（`%LOCALAPPDATA%/MedAnalyzerDeploy`）
2. 自动启动本地服务（默认 `http://127.0.0.1:8080`，端口占用会自动顺延）
3. 可按需自动打开浏览器

可选环境变量：

- `PORT`：指定启动端口
- `OPEN_BROWSER=true`：启动后自动打开浏览器
- `BACKEND_URL`：指定后端地址，默认 `http://127.0.0.1:18080`

可选启动参数：

- `--port=8080` 或 `--port 8080`：指定前端静态服务监听端口
- `--apiport=18080` 或 `--apiport 18080`：指定内置 `/api/*` 代理转发到的后端端口
- `--autopen`：启动后自动打开默认浏览器访问前端界面；不传时不自动打开
- `--help` 或 `-h`：显示启动帮助并退出

示例：

```sh
./release/MedAnalyzerDeploy-macos-arm64 --port=8090 --apiport=19090 --autopen
```

说明：

- 前端所有后端请求统一走 `/api/*` 前缀。
- `exe` 内置代理会把 `/api/*` 转发到 `BACKEND_URL`，且保留 `/api/` 前缀不改写。
- 如果你后端监听地址写的是 `0.0.0.0:18080`，前端/代理访问时应使用 `127.0.0.1:18080`（`0.0.0.0` 仅用于服务端监听，不是推荐的客户端访问地址）。

开发模式（`npm run dev`）可用以下方式指定代理目标：

```sh
VITE_API_TARGET=http://127.0.0.1:18080 npm run dev
```
