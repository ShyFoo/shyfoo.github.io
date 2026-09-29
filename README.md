# Shuai Fu · Academic Homepage

这是一份可直接部署到 `https://shyfoo.github.io/` 的完整静态项目。沿用旧站的 `index.html`、`style.css`、`components/`、`figures/` 组织方式，不需要 npm、Jekyll 或额外构建。

## 快速替换原主页

需要 Python 3、Git，以及你平时向 GitHub 推送代码所用的登录配置。

1. 解压项目包，进入其中的 `shyfoo.github.io` 文件夹。
2. 本地预览：

   ```bash
   python3 tools/preview.py
   ```

   浏览器会打开 `http://127.0.0.1:8000/`。按 Ctrl+C 停止。Windows 可将 `python3` 换成 `py -3`。页面使用 HTML 分文件加载和 JavaScript 模块，请通过本地服务器预览，不要直接双击 `index.html`。

3. 如果电脑上还没有旧站仓库，先在**另一个位置**克隆：

   ```bash
   git clone https://github.com/ShyFoo/shyfoo.github.io.git ../shyfoo-site-live
   ```

4. 在 GitHub 的原仓库中确认一次：**Settings → Pages → Build and deployment → Deploy from a branch → main → /(root) → Save**。如果本来就是这个设置，无需修改。
5. 在解压后的新版项目文件夹内运行：

   ```bash
   python3 tools/replace_homepage.py ../shyfoo-site-live --publish
   ```

   如果你已有本地仓库，将 `../shyfoo-site-live` 换成它的实际路径。例如：

   ```bash
   python3 tools/replace_homepage.py "$HOME/projects/shyfoo.github.io" --publish
   ```

这条命令会依次检查目标仓库、备份旧版本、复制新文件、提交并推送到 `origin/main`。备份 ZIP 保存在目标仓库的上一级目录；不会覆盖 `.git`，不会改写历史，也不会删除无关文件。GitHub Pages 完成发布后，网址仍是 `https://shyfoo.github.io/`。发布进度可在仓库的 Actions 页面查看；浏览器仍显示旧内容时可以强制刷新。

本项目提供替换工具；下载项目包本身不会修改你的 GitHub 仓库。

## 只替换本地文件，暂不发布

```bash
python3 tools/replace_homepage.py /path/to/your/shyfoo.github.io
```

此时只进行备份和复制，不执行提交或推送。查看 `git diff` 后，可以通过 GitHub Desktop 或你平时使用的 Git 工作流发布。

预先检查而不修改任何文件：

```bash
python3 tools/replace_homepage.py /path/to/your/shyfoo.github.io --dry-run
```

目标仓库存在未提交改动或未跟踪文件时，脚本会停止，避免混入正在进行的工作。请先提交或移走这些文件。使用 `--publish` 时，目标仓库必须在 `main` 分支；若远端已有新提交，请先在目标仓库执行 `git pull --ff-only`，再运行替换命令。脚本不会强制推送。

## 不使用命令行的方式

1. 在原仓库点击 Code → Download ZIP，先备份旧站。
2. 打开原仓库，选择 Add file → Upload files。
3. 将新版 `shyfoo.github.io` 文件夹**内部的文件和子文件夹**上传到仓库根目录并提交，包括 `.nojekyll`；不要在根目录下再套一层同名文件夹。
4. 确认 Pages 使用 `main` 分支的 `/(root)`。

## 文件怎么维护

| 文件 / 目录 | 内容 |
| --- | --- |
| `index.html` | 页面框架、导航、大标题、页脚 |
| `style.css` | 全站排版、颜色、字号与移动端样式 |
| `components/profile.html` | 头像、姓名、联系方式、座右铭、龙珠交互区域 |
| `components/header.html` | About me 正文、导师链接与研究经历 |
| `components/news.html` | 真实 News，以及保留在注释中的 9 条示例 |
| `components/papers.html` | 论文标题、作者顺序、会议/年份、原图与资源链接 |
| `components/teaching.html` | 教学经历 |
| `components/awards.html` | 奖项 |
| `components/services.html` | 会议、期刊审稿服务 |
| `figures/portrait.jpg` | 头像 |
| `figures/paper/` | 从旧站迁入的 4 张论文缩略图 |
| `figures/shenron.png` | 神龙图片 |
| `js/load-components.js` | 先加载各 HTML 内容，再启动交互 |
| `js/app.js` | 导航、邮箱弹窗与机器人 |
| `js/news-scroll.js` | News 自动滚动、悬停暂停与手动浏览 |
| `js/toybox.js`、`js/toy-physics.mjs`、`js/dragon-stars.mjs` | 龙珠、一次性许愿与物理交互 |
| `js/vendor/` | 本地 Three.js、cannon-es 及其许可证 |
| `tools/preview.py` | 本地预览 |
| `tools/replace_homepage.py` | 备份、替换、可选提交与推送 |
| `deploy-files.json` | 本项目文件清单，供替换工具使用 |

编辑 `components/` 中的内容后直接提交即可，不需要重新生成 `index.html`。文件中的图片路径相对于主页根目录，例如 `figures/paper/nemesis.png`。

## 这次迁移了什么

以旧仓库提交 `9258e82b0ea93b5c4e4155a2941eddb8f6f9bf70` 为内容来源，保留此前确定的新版布局和交互：

- 完整简介：AIML、Adelaide University、Qi Wu 导师链接、2022–2024 年 SUSTech RA 经历、Yu Zhang 导师链接与研究兴趣。
- 4 篇旧站论文：Counting Hallucinations in Diffusion Models、GITA、Nemesis、Learning Retrieval Augmentation for Personalized Dialogue Generation。作者顺序、星号、会议/年份、Spotlight 信息、图片以及全部论文/代码/数据/项目链接均保留。旧站数据集链接指向个人主页或 collection 时也保留原地址。
- 旧站 5 条 News 全部迁入。另保留此前确认的 TerraVis / NeurIPS 2026 动态和 2025 年 7 月博士候选资格动态，当前共 7 条。
- 3 项奖项、10 个会议、4 本期刊，以及 Teaching Assistant / Artificial Intelligence (COMP SCI 3007) / Spring 2025。保留新版的 “Tutorials, marking, and student support.”。
- 头像使用此前在本次设计中确认的版本。联系方式、座右铭与仅 “© Shuai Fu” 的页脚保留。
- 两个演示论文条目及其占位链接已移除。TerraVis 的 News 保留；其完整论文条目可以等正式标题、作者和资源链接准备好后，再加入 `components/papers.html`。

旧站的 Jon Barron 灵感致谢记录在 `THIRD_PARTY_NOTICES.md` 中；页面仍使用此前确认的简洁页脚。旧站访问统计脚本没有带入。

## 以后怎样加 News

在 `components/news.html` 的 `<ul id="news-list">` 最上方加入新的 `<li>`。文件底部的 `<!-- NEWS EXAMPLES ... -->` 是完整保留的 9 条示例，包括 💬、🧪、📝、💻、📚、🤝、🔎、🛠️、✨，它们不会显示在页面里。

需要复用时，复制一条到注释外，修改日期和文字，删除 `data-example="true"` 和 `<span class="news-example">Example</span>`。例如：

```html
<li>
  <time datetime="2027-01">Jan 2027</time>
  <p><span class="news-icon" aria-hidden="true">🎉</span>在这里填写真实的新动态。</p>
</li>
```

保留正常的 HTML 注释起止符，不要把整段示例一起取消注释当成真实履历。

## 以后怎样加论文

复制 `components/papers.html` 中完整的 `<article class="publication-row">`，修改唯一 ID、标题、作者、会议/年份、摘要、图片和资源链接。你的姓名用 `<strong>Shuai Fu</strong>` 加粗。缺少的资源链接直接不放。整行没有点击跳转；只有各个实际链接可点击。列表超过容器高度后可手动滚动。

## 回退

每次运行替换脚本都会在目标仓库旁保存一次旧版本 ZIP。另在下载包的 `original-homepage-backup/` 中保留本次迁移来源的完整旧站文件备份。

如果已经发布，推荐在本地仓库找到这次 “Refresh academic homepage” 的提交，然后执行 `git revert 该提交的SHA`，再 `git push origin main`。这会新增一次回退提交，保留所有历史。也可以从备份 ZIP 恢复旧文件，再提交和推送。

GitHub Pages 官方发布说明：
https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
