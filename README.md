# SCL-90 症状自评量表 H5

基于 uni-app、Vue 3 和 wot-design-uni 的 SCL-90 症状自评量表 H5 应用。

## 本地开发

```bash
npm install
npm run dev:h5
```

## 构建

```bash
npm run build:h5
```

构建产物目录：

```text
dist/build/h5
```

## Cloudflare Pages

连接 GitHub 仓库后，Cloudflare Pages 可使用以下配置：

- Framework preset：None
- Build command：`npm run build:h5`
- Build output directory：`dist/build/h5`
- Root directory：`/`

如果构建环境 Node.js 版本过低，可在 Cloudflare Pages 的环境变量中设置：

```text
NODE_VERSION=22
```
