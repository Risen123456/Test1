# Test1

这是一个基于 React 和 Vite 的项目，适用于构建现代化的 Web 应用程序。

## 开始使用

### 安装

确保已安装 Node.js 和 npm，然后运行以下命令安装依赖：

npm install

### 开发

启动开发服务器：

npm run dev

### 构建

构建生产环境版本：

npm run build

构建完成后，会在项目根目录下生成 `dist` 文件夹。

## 部署到 GitHub Pages

1. 确保项目根目录下有 `dist` 目录（执行 `npm run build` 生成）
2. 在 GitHub 上创建一个新仓库
3. 将项目推送到 GitHub 仓库
4. 进入仓库设置，找到 "Pages" 选项
5. 在 "Build and deployment" 部分，选择 "Deploy from a branch"
6. 选择 `main` 分支，然后选择 `/dist` 目录
7. 点击 "Save" 按钮，GitHub Pages 将自动部署项目

## 项目结构

```
├── src/              # 源代码目录
│   ├── App.jsx       # 主应用组件
│   ├── App.css       # 应用样式
│   └── main.jsx      # 应用入口
├── index.html        # HTML模板
└── package.json      # 项目配置
```

## 技术栈

- React 18
- Vite
- CSS
