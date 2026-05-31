# 抖音发布包说明

## 虚拟创作平台（vcreate）互动场景 — 必看

上传地址：[抖音虚拟创作平台 · 互动](https://vcreate.douyin.com/console/interaction)

平台在 **Edge 浏览器** 中打开 zip 根目录的 **`index.html`**。

| 命令 | 产物 | 用途 |
| --- | --- | --- |
| `npm run pack:vcreate` | `release/mindscape-vcreate-*.zip` | 完整 H5 互动包（`index.html` + `js/` + `css/`） |
| `npm run pack:demo-html` | `release/mindscape-demo-vcreate-inline.zip` 或 `.html` | **Demo 单页**（全内联，推荐试玩/过 script 扫描） |
| `npm run pack:tt` | `release/mindscape-tt-*.zip` | 抖音开发者工具 / 小程序上传 |

若误传 `mindscape-tt-*.zip`，只有说明页或无法执行的 `.ttml`，预览会 **白屏**。

```bash
cd mindscape-douyin-miniapp
npm run pack:vcreate
```

完整包构建使用 `publicPath: ./`，避免脚本路径 `/js/...` 在 zip 预览里 404。

### Demo 单页（`pack:demo-html`）

- 上传 **`mindscape-demo-vcreate-inline.zip`**（仅含 `index.html`）或 **`mindscape-demo-vcreate.html`**
- 勿上传含外链 `js/` 的 `mindscape-demo-vcreate.zip`（平台预览易 **白屏**）
- 单 HTML 上传前须通过构建期 script 净化（见 `scripts/platform-script-sanitize.js`）

---

## 小程序 IDE 打包

## 一键打包

在项目根目录 `mindscape-douyin-miniapp` 下：

```bash
# 填写真实小程序 AppID（推荐）
set TARO_APP_ID=你的AppID
npm run pack:tt
```

产物目录：`release/`

- `mindscape-tt-<version>-<时间>.zip` — 可导入抖音开发者工具的代码包
- 同名 `.manifest.json` — 构建元信息（appid、体积等）

仅重新打 zip（已执行过 `build:tt`）：

```bash
npm run pack:tt -- --skip-build
```

## 开放平台基础要求（本包已对齐）

| 项 | 说明 |
| --- | --- |
| 目录结构 | zip 根目录含 **`index.html`**（平台 Web 入口标记）、`app.json`、`app.js`、`project.config.json`，`miniprogramRoot` 为 `./` |
| 页面四件套 | 各页面含 `index.js` / `index.json` / `index.ttml`（Taro 编译产出） |
| 主包体积 | 当前主包约 1MB 级，低于主包 **4MB** 上限；脚本超限会失败退出 |
| 域名 | `project.config.json` 中 `urlCheck: true`；若 WebView 走 HTTPS，须在后台配置业务域名 |
| 粒子云 | 31 天预设与 gzip bundle 已打进 JS；抖音 `web-view` 使用包内解压后的本地文件，不依赖 `data:` |

## 导入与上传

### 方式 A：开发者工具导入 zip

1. 安装 [抖音小程序开发者工具](https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/developer-instrument/overview)
2. 解压 `release/*.zip` 到空目录
3. **导入项目** → 选择解压目录（根目录须含 `index.html` 与 `app.json`）
4. 确认 AppID 与开放平台一致
5. 预览 / 真机调试通过后，点击 **上传**

### 方式 B：命令行上传（需先登录）

```bash
npx tma login
npx tma upload -v 1.0.0 -c "首次上传 MindScape" dist
```

上传对象是 **`dist` 目录**（与 zip 内容一致），不是整个 monorepo。

## 提交前检查

- [ ] `project.tt.json` 或 `TARO_APP_ID` 已改为正式 AppID（非 `touristappid`）
- [ ] `npm run particle:pack-static` 已执行（`pack:tt` 会自动执行）
- [ ] `npx tma project-size dist` 主包 &lt; 4MB
- [ ] 开放平台已配置 WebView 业务域名（仅在使用设置页 HTTPS 粒子地址时需要）
- [ ] 隐私协议、用户协议等合规项在后台按类目要求配置

## 体积与分包

若后续主包超过 4MB，需：

1. 在 `app.config.ts` 配置 `subPackages`
2. 将非首屏页面与大型资源迁入分包（单分包 ≤ 2MB，总分包 ≤ 16MB）

官方说明：[小程序分包](https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/tutorial/basic-ability/subpackages/introduction)
