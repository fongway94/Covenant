# Covenant 圣约 — 行走在神话语之中

一个**中文优先、可切换英文**的互动圣经故事 RPG。你不是在读关于大卫、但以理或以斯帖的故事——你**站在他们身旁**：甩出石子、潜过狮子坑、在风浪中掌舵、奔向父家。

> 玩家是**见证者**。你的选择塑造你自己的品格，绝不改写圣经的结局。

---

## 手机上怎么玩

| 方式 | 现在能用？ | 需要做什么 |
|---|---|---|
| **Arena 实时预览面板** | ✅ | 在 Arena 界面里直接点开预览即可（Arena 会注入沙箱的私有令牌）。 |
| **`Covenant-offline.html`** — 单文件离线版 | ✅ | 下载后发到手机（微信／WhatsApp／AirDrop／邮件），用浏览器打开。**无需服务器、无需网络**，全部插画、字体、代码都已内嵌。 |
| **GitHub Pages** — `https://fongway94.github.io/Covenant/` | 需要你点 3 下 | 打开 `https://github.com/fongway94/Covenant/settings/pages` → Build and deployment → Source 选 **Deploy from a branch** → 分支 `arena/c138bec0-covenant`、目录 `/ (root)` → Save。约 1 分钟后即可访问，是一个真正的 HTTPS PWA，可分享给任何人。 |

> 为什么 `…e2b.app` 预览链接打不开：Arena 的沙箱受私有 `e2b-traffic-access-token`
> 请求头保护，只有 Arena 自己的预览面板会带上它。裸链接无法携带该请求头——这是
> 托管限制，不是游戏的问题。

---

## 这一版有什么

### 语言
- **默认简体中文**，一键切换英文（标题页右上角、地图 HUD、角色设置页都有切换按钮）。
- 全部 6 章、41 个场景、165 句对白、96 个选项、96 段回应，以及圣物／果子／印记／称号／应许，全部有中文。
- 经文引用使用**中文和合本**（公有领域）；英文模式使用 KJV（公有领域）。
- 偏好保存在本机；中文模式自动启用中文字体栈（苹方／思源黑体／微软雅黑等）。
- `npm run check:i18n` 会扫描两种语言，报告任何漏译或语言串漏。

### 六个可操控的互动关卡（每章一个）
不是点一下就过的计时条，而是**真正操控角色**的 canvas 小游戏：

| 章节 | 关卡 | 操作 | 玩法 |
|---|---|---|---|
| 以拉谷 | 甩石迎敌 | 拖动瞄准，松手投出 | 5 颗石子，命中歌利亚额头 2 次；有风向与他举起的盾牌 |
| 狮子坑 | 潜行狮子坑 | 拖动移动，松手躲藏 | 避开狮子的视野锥，收集 3 个祷告碎片，走到右边的光里 |
| 耶利哥路上 | 耶利哥路上 | 左右拖动闪避 | 躲开落石与强盗，收集 6 枚银币交给店主 |
| 平静了吧 | 掌舵迎浪 | 拖动掌舵，点击舀水 | 抵抗风浪保持船身平衡，舀出积水，撑到风浪止息 |
| 远方之地 | 奔向父家 | 点击跳跃 | 跳过猪群、荆棘和空酒杯，接住关于家的记忆 |
| 为现今的机会 | 伸出的金杖 | 按住前进，松手静止 | 金杖举起时前进、落下时冻结（红灯绿灯），别被守卫发现 |

关卡成绩会反馈到故事里：成功可获得 **+14 经验、+1 勇气、+1 信心**及对应印记标记。
每关都可**跳过**（无奖励），不会卡住剧情。

### 其它互动与动画
- **隐藏物品**：在插画上点击发光点（以拉谷拾 5 块石子、为伤者包扎 3 处伤口、但以理祷告的 3 个地方），有奖励。
- **地图角色控制**：拖动朝圣者沿路行走，拖到章节附近即可打开该章。
- **滑动选选项**：选项卡片可以像卡牌一样左右滑动做出选择，也可以直接点。
- **按住祷告**：按住祷告键约 0.85 秒，光环填满后祷告（快速点击也有效）。
- **动画**：标题页星空／流云／浮尘／十字光晕；故事插画视差漂移、人物剪影浮动、说话者头像弹入与呼吸、打字机对白、选项卡片错落入场；奖励彩带爆裂；关卡中的粒子、震屏、飘字、视野锥、水面起伏。
- 所有精灵都是**矢量绘制**，没有新增图片资源，离线也能跑。

### 原有系统（保留）
分支对话、四种品格（勇气／智慧／怜悯／信心）、等级与经验、九种圣灵果子、六件圣物、七枚印记、书卷日志、角色卡、每章一次祷告、反思题、自动存档、程序化音效、PWA 离线缓存、Capacitor 原生打包配置。

---

## 本地运行

```bash
npm install          # jsdom / esbuild（仅测试与单文件构建需要）
npm run dev          # 或 npm start — 在 4173 端口启动静态服务器
```

打开 `http://localhost:4173/`。也可以直接用任意静态服务器；源码就是原生 ES modules，无需编译。

### 命令

```bash
npm run check        # 校验 6 章内容、链接与状态转移
npm run smoke        # 无头浏览器跑通 6 章 + 6 关卡 + 隐藏物品 + 中英切换 + 重置
npm run check:i18n   # 检查中英文界面完整性
npm run build:www    # 生成 www/（Capacitor 的 webDir）
npm run build:single # 生成 Covenant-offline.html（单文件离线版）
npm run smoke:single # 验证单文件版能独立运行
npm run icons        # 重新生成 PNG 图标（仅用 Python 标准库）
```

原生打包步骤见 `docs/MOBILE_DEPLOY.md`；设计原则与章节模板见 `docs/GAME_DESIGN.md`；六个关卡的细节见 `docs/INTERACTIONS.md`；后续规划见 `docs/ROADMAP.md`。

---

## 项目结构

```
index.html                 移动端外壳
manifest.webmanifest       PWA 清单
sw.js                      离线缓存（covenant-v2）
capacitor.config.json      iOS / Android 打包配置
src/
  main.js                  路由、输入、滑动 / 按住 / 拖动交互
  styles.css               移动端设计系统 + 动画
  core/
    i18n.js                语言状态、t() / tx() / DOM 翻译 / 数据换语言
    state.js               存档、奖励、进度
    audio.js               程序化音效
    util.js  bus.js        辅助函数 / 晚绑定回调
  data/
    chapters.js            6 章英文结构（节点 / 选项 / 关卡 / 隐藏物品）
    compendium.js          品格 / 称号 / 果子 / 圣物 / 印记 / 应许
    zh-story.js            完整中文故事（165 句 / 96 选项 / 96 回应）
    zh-ui.js               中文界面词典、动态模板、参考数据
  engine/
    scene.js               canvas 场景引擎（输入、循环、粒子、精灵）
    games.js               6 个故事关卡
  screens/
    home.js  world.js  story.js  modals.js
assets/
  art/       8 张原创插画
  icons/     PWA 图标
  fonts/     Noto Sans Symbols 子集 + OFL 许可
tools/       serve / validate / smoke / check-i18n / build-www / build-single / icons
docs/        GAME_DESIGN / INTERACTIONS / MOBILE_DEPLOY / ROADMAP
Covenant-offline.html      生成的单文件离线版
```

---

## 关键决定

- **一个代码库，两个平台**。同一套 PWA 通过 Capacitor 打包到 iOS 与 Android；原生工程未生成（需要 Xcode / Android Studio）。
- **中文优先，英文可切换**。语言偏好存 localStorage；切换时原地重建界面，不丢存档。
- **玩家是见证者**。大卫仍然迎战歌利亚，风浪仍然止息——互动关卡改变的是玩家的体验与品格，不是经文结局。
- **互动要服务故事**。每个关卡都从该章的具体处境长出来（甩石、潜行、掌舵、回家、金杖），而不是套一个通用小游戏。
- **无第三方运行时依赖**、无追踪、无广告、无账号。

## 你仍需决定的事

译本（和合本／新译本／英文 licensed 译本）、神学审阅流程、目标年龄层、本地化语言（简体／繁体／马来文／淡米尔文等）、是否直接描绘耶稣的形象。

## 鸣谢与许可

- 插画为本项目生成；图标由 `tools/make_icons.py` 生成。
- 装饰符号使用 Noto Sans Symbols 1 & 2 子集，SIL OFL 1.1（`assets/fonts/OFL-Noto-Sans-Symbols.txt`）。
- 中文经文引用：和合本（公有领域）；英文经文引用：KJV（公有领域）。
- 游戏内的其他对白为本作创作，不是经文。

---

*v0.2 原型 · 在马来西亚槟城为「让人认识神与圣经」这个想法而做。*
