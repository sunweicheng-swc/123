# 良心大考验

一款仅供朋友间娱乐的三关互动问答小游戏。第三关以一段约 3.4 秒的 Canvas 烟花开场，可随时跳过。终极选择通往两个结局，玩家可以随时重玩。

- 第一关逐字亮出问题，按下开始按钮即可完成勇气认证。
- 第二关可以直接确认，也可以在犹豫提示里返回，或保留原回答继续。
- 第三关可以点按背景放一朵烟花，也可以使用「点亮夜空」按钮。
- 奖励结局有烟花、纸屑、奖杯和动态计分。另一种结局可以回去重选，也可以坚持答案并结束游戏。
- 支持键盘操作、Esc 关闭弹窗、浏览器返回和刷新恢复。系统开启减少动态效果时，直接进入终极问题，奖励页的「重看烟花」会展示静态烟花留影。

游戏内的判定只是娱乐反馈。网页使用 HTML、CSS 和原生 JavaScript，所有资源随项目一起提供。

## 本地预览

直接在浏览器打开项目根目录的 `index.html`。也可以在项目目录运行下面的命令，然后访问 [本地预览](http://localhost:8000/)。

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

## 文件结构

```text
.
├── index.html         # 三关、两种结局和提示弹窗
├── css/
│   └── style.css      # 夜空主题、响应式布局和界面动画
├── js/
│   ├── main.js        # COPY 文案配置、关卡、路由和计分
│   └── fireworks.js   # Canvas 星光、烟花、问号和纸屑
├── assets/
│   └── mark.svg       # 游戏标志和浏览器图标
├── .nojekyll          # 让 GitHub Pages 直接提供静态文件
└── README.md
```

## 修改姓名和文案

打开 `js/main.js`，编辑顶部的 `COPY` 对象。

| 要改的内容 | 配置位置 |
| --- | --- |
| 网页标题和左上角游戏名 | `COPY.title` |
| 第三关的人名 | `COPY.name` |
| 三关问题和按钮 | `COPY.courage`、`COPY.honesty`、`COPY.final` |
| 犹豫和重选提示 | `COPY.honesty.dialog`、`COPY.final.dialog` |
| 两种结局 | `COPY.victory`、`COPY.integrity` |
| 重玩、跳过、底部提示等公共文案 | `COPY.ui` |

问题可以写为字符串，也可以用字符串数组指定换行。第三关问题里的 `{name}` 会自动替换成配置中的姓名。修改 `INTRO_DURATION` 可以调整烟花开场时长，单位为毫秒。烟花的颜色与发射节奏分别在 `js/fireworks.js` 的 `palette` 和 `setMode()`、`scheduleCelebration()` 中。

## 发布到 GitHub Pages

1. 登录 GitHub，通过 [New repository](https://github.com/new) 创建一个空的公开仓库。用 Git 推送时，创建仓库时保持 README、许可和 `.gitignore` 的初始化选项未勾选。
2. 在本项目根目录打开终端。把下面命令中的 `YOUR_USERNAME` 和 `YOUR_REPOSITORY` 替换成你的 GitHub 用户名和刚创建的仓库名，或把整个远程地址替换成 GitHub 提供的地址。也可以用仓库页面的 **Add file → Upload files** 上传，保持项目原有的目录结构，让 `index.html` 位于仓库根目录。

   ```sh
   git init -b main
   git add -- index.html css js assets .nojekyll README.md
   git commit -m "Add conscience quiz"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
   git push -u origin main
   ```

3. 在该仓库打开 **Settings → Pages**。在 **Build and deployment** 下，选择 **Deploy from a branch**，将分支设为 `main`，目录设为 `/(root)`，然后点击 **Save**。[GitHub Pages 发布源文档](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
4. 部署完成后，在 **Settings → Pages** 点击 **Visit site**。普通项目仓库的页面地址格式为 `https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/`。分享这个地址即可。后续更新推送到同一分支后，GitHub Pages 会重新发布。
