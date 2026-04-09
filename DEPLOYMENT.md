# Vercel 网页部署指南

本文档记录了如何将原生的纯前端项目（仅包含 HTML、CSS、JS）免费部署到 Vercel 平台上。

## 概览

因为当前项目是纯原生的 HTML 项目，**不需要**类似于 Vite、Webpack 或 React 这样的预编译打包流程。所以在部署 Vercel 时，最核心的关键点是**覆盖默认的构建命令阻止其运行 `npm install`**。

## 📍 部署步骤指南

### 第一步：将代码推送到 GitHub
确保您本地的最新代码都已经推送到关联的 GitHub 仓库中（例如 `scrapbook-editor`）。
```bash
git add .
git commit -m "部署准备"
git push -u origin main
```

### 第二步：在 Vercel 导入项目
1. 登录 [Vercel 后台](https://vercel.com/dashboard)。
2. 点击页面右侧的 **"Add New..."** 按钮，选择 **Project**。
3. 在 Import Git Repository 列表中找到刚刚推送的 GitHub 仓库并点击 **Import**。

### 第三步：配置部署参数 (💡最关键步骤)
由于本项目没有 `package.json` 且不需要打包，必须修改默认配置以防止报错：

在导入过程中的 **Project Settings** 配置阶段中（或者对已有的失败部署在顶部进入 **Settings** 页面中寻找）：

1. **Framework Preset**（框架预设）
   - 必须选择 **`Other`**。

2. **Build and Output Settings**（构建与输出设置）
   - **Build Command**（构建命令）: 打开 Override 覆盖开关，输入 `echo "skip build"` （或将其清空）。
   - **Install Command**（安装命令）: 打开 Override 覆盖开关，输入 `echo "skip install"` （或将其清空）。
   - **Output Directory**（输出目录）: 打开 Override 覆盖开关，**将其彻底清空**。

3. **Environment Variables**（环境变量）
   - 原生前端应用一般没有安全后端通讯需求，**直接留空即可**。

### 第四步：部署与发布
- 设置完毕后，点击底部的 **Deploy** 进行部署。
- 构建环境通常会在 10-30 秒内完成分配并直接输出根目录文件。
- 最后，Vercel 会自动为您分配一个 `.vercel.app` 免费域名，您也可以在项目的 `Settings -> Domains` 中绑定您自己购买的独立域名。

---

## 常见报错解决记录

**❌ 报错信息：** 
```text
npm error code ENOENT
npm error path /vercel/path0/package.json
Error: Command "npm install" exited with 254
```
**原因：** Vercel 自动尝试执行了 Node.js 的包安装命令，却未找到相应的配置文件。
**解决方法：** 参照上述 **第三步** 强制覆盖（取消） Build 和 Install 命令，然后去 `Deployments` 选项卡重新触发 Redeploy 即可解决。
