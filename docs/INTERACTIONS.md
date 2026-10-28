# v0.7 — 每章两个「故事里的一刻」+ GPU 体积光 + 写实场景图

## 不用游戏引擎的理由

引擎能帮的是 **GPU 着色器**，不是美术。Unity / Godot / Phaser 会让单文件离线包变大、要求重写 10 个稳定关卡，而且不会自动让图变好看。所以直接用 WebGL 写了一个零依赖的全站着色器层：

- `src/engine/atmosphere.js`：3 道缓慢漂移的体积光柱、悬浮尘埃、1/12 秒更新的胶片颗粒、柔和暗角与暖色调。约 130 行，无外部贴图、无网络请求。
- `main.js` 创建**一个持久 canvas**，每次渲染把它移进当前场景的美术容器（`.story-art` / `.action-screen` / `.title-art` / `.camp-hero` / `.finale-art`）。移动同一个 canvas 不会重建 WebGL context。canvas 脱离 DOM 时跳过绘制。
- 无 WebGL 时静默降级为原来的静态美术；`prefers-reduced-motion` 也受尊重。

## 写实场景图

6 张（elah / lions / jericho / storm / prodigal / esther）换成电影级写实渲染，统一 848×1264 竖版。`tools/process-art.py` 负责把生成器输出（可能是 1408×768 横版或 848×1264 竖版）居中裁切、Lanczos 缩放、轻微锐化与上下渐暗，保证标题文字可读。剩余 7 张待下一轮补齐（平台每回合图像生成上限 10）。

## 20 个「故事里的一刻」

`src/data/moments.js`（数据）+ `src/engine/moments.js`（引擎）。5 种交互：hold / tap / trace / balance / rhythm，每章 2 个，出现在指定 node 的台词之后。

- `afterLines()` 先检查 `momentFor()`，再依次处理 game / hotspots / mini / choices；`s.doneNodes[nodeId+":moment"]` 保证只出现一次。
- `storyHtml()` 在 `phase === "moment"` 时输出 `momentHtml()`，复用章节美术和 HUD，只把对话区换成一张互动卡。
- 完成 +6 XP、+1 对应的走路方式；随时可跳过；跳过或超时都不会卡住剧情。
- `npm run check:moments` 用 jsdom 校验数据完整性、双语、5 种引擎都能启动、跳过能结束、tap 能被真正点赢。

## 沉浸模式的分析纯度

`revealHints()` / `guidedChoose()` 现在调用 `addHintUse()` 记到 `adventure.hintsUsed`，不再记入走路方式。终章「旅程之镜」会据此显示不同说明。默认 `cleanMode: true` 保持不变。

---

# v0.6 — 旅程之镜、红字原则、每章回到圣经、共享画面特效

## 旅程之镜（不是人格测验）

见 `README.md` 与 `docs/GAME_DESIGN.md`。实现在 `src/data/mirror.js` / `src/screens/camp.js`：
从 `adventure.ways`（step / notice / stay / wait）与 `stats` 归一化后打分，选出一主一副两位圣经人物；
主档案完整展示「经文 / 为什么相似 / 诚实的失败 / 神的恩典 / 去读哪一段」，并可直接打开对应书卷。
`npm run check:mirror` 校验数据完整性与确定性。

## 红字原则

见 `docs/GAME_DESIGN.md` 第 2 条。`npm run check:redletter` 在中英双语逐一核对 20 条 `jesus` / `voice` 台词。
本次修正：中文《好撒玛利亚人》一段原本把律法师的回答错位放进耶稣口中，现已对齐 KJV／和合本；
燃烧荆棘中「我是我所是」的解释性台词改为旁白（不再是神在说创作对白）；撒该一章耶稣的回复改为纯路加福音 19:10 引用。

## 每章回到圣经

`src/data/deeper.js`：10 章各一段真实经文地址、一个观察点、一个问题。章末奖励页与书卷弹窗都显示「再走一步」卡；
终章汇总成可点击的十段经文阅读清单（`data-action="mirror-scroll"`）。

## 共享画面特效

`src/engine/scene.js`：universal 点击涟漪（`c.ring`）、拖曳光带（`trail`）、加色混合发光火花、
冲击停顿（`hitStop`）、连击浮字与 HUD 提示、浮动文字带描边缩放。
`src/engine/visual.js`：新增 `lightRays()`（缓慢漂移的体积光）与 `softVignette()`（呼吸暗角），
由 `games.js` 的 `bg()` 统一调用，10 个关卡同时受益。
`src/styles.css`：选项卡错落入场、结算星星弹出、完成印记光晕、按压反馈，以及 `prefers-reduced-motion` 降级。

> 真机验证：Chromium 390×844 下跑过标题、营地、终章（中／英）、阅读清单弹窗、互动关卡、章末奖励页；
> 无 console error、无 404，所有按钮都在可视区域内。

---

# v0.5 — 会呼吸的配乐、默认沉浸模式、说得清楚的结局

> v0.4.1 的真机修复与关卡审查全部保留在下文。

## 音乐重做：从「三层 drone」到「四声部配乐」

旧版只有低频 drone + 布朗噪声 + 随机五声音符，听久了很平。现在 `src/core/audio.js`：

- 每种氛围有 4 小节**和弦进行**（`PROG.warm / solemn / hope / desert / ocean / triumph`），垫音与双低音跟着和弦滑行（0.18–0.34s 到达，避免与拨弦错音）。
- **拨弦声部**：8 步乐句轮廓每小节轮换，有休止、八度应答、±18ms 人性化时值、左右声像摆动；双振荡器经扫描低通形成拨弦衰减。
- **对抗旋律**：偶数小节的第 1/3/5/7 步，一支带 5Hz 揉弦的长笛式长音回答竖琴。
- **框鼓 + 卷积混响**：强拍低鼓（118→46Hz）与气声击点；所有声部共享程序生成的 1.9s 脉冲响应混响。
- **动态强度**：`syncAmbience()` 在 `mini / action / hotspots` 场景传 `intensity=1` → 鼓点更密、拨弦更快更亮。
- 切章约 1 秒交叉淡化；标签页隐藏自动静音；首次手势后才创建 AudioContext。
- `npm run check:audio` 用 mock Web Audio 驱动调度器，逐一验证 9 种氛围（含参数有限性、幂等渲染、开关重启）。

## 默认沉浸模式

`DEFAULT_SETTINGS.cleanMode = true`，并且 `settingsVersion = 2`。旧存档（含明确的 `cleanMode:false`）在 `loadGame()` 中**一次性迁移**并立即写回，之后玩家在设置里的选择永远生效。`tools/smoke.js` 覆盖：新档默认 true、旧档迁移、玩家关闭后重载仍为 false。

## 结局说清楚了

终章新增完成印记（姓名 / 主导品格称号 / 章节数 / 日期）、「你完成了什么」段落、「你走完的旅程」六项清单，以及「带到游戏之外」的四件具体小事（讲一个故事、选择前先呼吸、读耶利米书 29 章、留意最难的品格）。神学边界不变：玩家是见证者，不是改写者；结局是镜子，不是计分板。

---

# v0.4.1 — 真机问题修复、全面关卡审查、环境音乐

## 两个真机 Bug

1. **完成面板被挤到屏幕外。** `.hotspot-done` 原本是 `.hotspot-screen` 的最后一个 flex 子项；
   在带浏览器工具栏的手机上，`hotspot-head` + `hotspot-field{flex:1;min-height:260px}` 会把它推到
   视口之外，而 `.screen{overflow:hidden}` 直接裁掉了「继续」按钮。现在它是**绝对定位的底部浮层**
   （`bottom: max(26px, safe-area + 22px)`），带遮罩、52px 大按钮与 `max-height:62vh` 内滚动。
   自动化验证：遍历 10 章渲染 `hotspots-done`，按钮矩形全部落在 `top>=0 && bottom<=vh-24`。
2. **跳跃后飞走不落地。** `dodgeStage.step` 把重力写成了 `s.vy -= 560*dt`。Canvas 的 Y 轴向下，
   重力应该**加**到 `vy`；写反后初速度 `-215` 会一直变负，角色永远向上飞。
   现已改为 `s.vy += 570*dt`，加上 `y` 的上下限保护，跳跃约 0.86 秒后必定回到地面。

## 顺带修好的公平性问题

`check:acts` 用「预言机」输入逐一通关每个准备幕，发现并修复了：

- `trace`（耶利哥、浪子）：原本要求 `progress >= 0.995`，但手指几乎不可能精确到顶端像素，
  会一直卡住直到超时。现在走到 94% 即判定抵达。
- `dodge`（大卫）：长枪每 0.82 秒来一支，而一次跳跃要约 0.8 秒，玩家来不及落地就会被下一支击中。
  现在间隔 1.15 秒、每次命中只扣 2 秒、允许 4 次失误，并把跳跃初速调到 -245。
- `rhythm`（但以理、路得）：第三轮的窗口被压到 0.085 且速度 1.8，人手几乎不可能命中。
  现放宽为最窄 0.115、最高速 1.35。
- 提灯搜寻：物品一旦被照亮就保持可见（`revealed`），不再需要「照亮与点击同时进行」。

## 环境音乐

`src/core/audio.js` 增加三层合成音频：呼吸低频 drone、滤波布朗噪声（风／水／人群）、
五声音阶旋律调度器。10 章映射 7 种氛围，切章交叉淡化；首次用户手势后才创建 AudioContext；
标签页隐藏自动静音。♪ 按钮出现在标题页、HUD、故事页，设置页有独立开关。
**没有任何外部音频文件**，离线与单文件版都能播放。

## 验证

```bash
npm run check:acts    # 每个准备幕 / 高潮关卡完整通关、跳跃落地、无 NaN、无卡死
npm run check:games   # 10 个多幕场景逐帧 step/draw
npm run check && npm run smoke && npm run check:i18n
npm run build && npm run smoke:single
```

---

# 互动设计 — Interaction Design

> 目标：让它不像「点对话的游戏」，而像**你在故事里面**。
> 原则：**互动必须从该章的具体处境长出来**，而不是套一个通用小游戏。

## 架构

两个新模块：

- `src/engine/scene.js` — canvas 场景引擎。统一的 rAF 循环、DPR 缩放、指针／键盘输入、
  粒子、飘字、震屏、生命值、进度条、HUD，以及 `c.end(success, score)` 回调。
- `src/engine/games.js` — 六个关卡，每个导出 `init / step / draw / onDown / onMove / onUp / onKey`
  以及中英文标题、说明与提示。

所有精灵（朝圣者、狮子、猪、巨人、船、金杖、银币）都是**矢量绘制**，没有新增图片。
好处：离线可用、单文件构建仍然只有几 MB、任意分辨率都清晰。

`src/screens/story.js` 在 `afterLines()` 里检查节点的 `game` / `hotspots` 字段：
进入对应 phase → 渲染全屏 canvas 或隐藏物品界面 → 完成后标记 `doneNodes[nodeId]`
→ 回到正常的 `choices / next / end` 流程。每个关卡都能跳过，绝不卡住剧情。

## 六个关卡

### 1. 以拉谷 · 甩石迎敌（sling）
- **控制**：从任意位置向左下拖动蓄力，松手投出；屏幕会显示预测弹道与风向。
- **目标**：5 颗石子命中歌利亚额头 2 次。
- **故事联系**：歌利亚会缓慢移动并周期性举起盾牌；风会改变弹道。呼应「大卫从溪中拣了五块光滑的石子」。
- **反馈**：命中时震屏 + 金色粒子 + 「命中！」；被盾挡住时灰色粒子 + 「被盾挡住！」。

### 2. 狮子坑 · 潜行狮子坑（lions）
- **控制**：拖动让朝圣者移动；**松手即「隐藏」**（角色变半透明并显示「隐藏中」）。
- **目标**：避开 4 头狮子的视野锥，收集 3 个祷告碎片，到达右侧的光。
- **故事联系**：呼应但以理在狮子坑中整夜安静信靠；「安静不动」本身就是玩法。

### 3. 耶利哥路上 · 耶利哥路上（jericho）
- **控制**：左右拖动躲避从上方落下的石块与强盗。
- **目标**：在路走完前收集 6 枚银币（交给店主）。
- **故事联系**：透视道路、落石、强盗；呼应好撒玛利亚人付代价的怜悯。

### 4. 平静了吧 · 掌舵迎浪（storm）
- **控制**：拖动左右反向掌舵抵消波浪；点击右下角「舀水」把水泼出去（空格键也可）。
- **目标**：撑过 20 秒风浪。
- **故事联系**：船身倾斜会让水位上升；后期天空放晴、星光亮起，呼应「大大地平静」。

### 5. 远方之地 · 奔向父家（prodigal）
- **控制**：自动奔跑，点击跳跃。
- **目标**：跑完 100% 的回家路。
- **故事联系**：躲开猪群、荆棘、空酒杯，接住关于家的记忆；远处父亲的房子随进度逐渐变大。

### 6. 为现今的机会 · 伸出的金杖（esther）
- **控制**：金杖举起时按住前进，落下时立刻松手静止（红灯绿灯）。
- **目标**：走到王座前，途中收集 3 个「恩宠」标记。
- **故事联系**：呼应未经召见进见的死罪；守卫的眼睛在红灯时会亮起，静止不动才安全。

## 隐藏物品

`hotspots` 字段挂在章节节点上（`count / glyph / title / titleZh / prompt / promptZh / xp / stat`）。
在章节插画上叠加发光按钮，点击收集。目前有三处：

| 章节 | 节点 | 内容 |
|---|---|---|
| 以拉谷 | `brook` | 拾起 5 块光滑的石子 |
| 耶利哥路上 | `help` | 用油和酒包扎 3 处伤口 |
| 狮子坑 | `upstairs` | 点击但以理一日三次祷告的地方 |

## 其它交互层

- **地图角色控制**：`.map-token` 可拖动；拖到章节附近会打开该章弹窗。
- **滑动选项**：`.choice` 支持横向滑动超过 52px 触发选择，带倾斜与拖动反馈。
- **按住祷告**：`data-hold="pray"` 按钮有 0.85 秒填充光环；快速点击也有效（向后兼容）。
- **奖励彩带**：完成章节时 18 个 CSS 彩带粒子随机落下。
- **尊重减少动画**：`prefers-reduced-motion` 会关闭所有动画。

## 难度与可用性

- 每个关卡 3 颗心、可跳过、失败也继续剧情（只是没有奖励）。
- 成功统一给 `+14 XP / +1 勇气 / +1 信心` 与 `<key>Won` 标记（可用于新印记）。
- 所有关卡都支持**键盘**：方向键 / WASD 移动，空格跳跃或舀水，Enter 触发选择。
- 引擎在没有 canvas 的环境（jsdom）里安全降级为「只能跳过」，不会崩溃。

## 加新关卡的步骤

1. 在 `src/engine/games.js` 里写一个游戏对象并加入 `GAMES`。
2. 在 `src/data/chapters.js` 的目标节点上加 `game: "yourKey"`（节点需有 `choices` 或 `next`）。
3. 在 `src/data/zh-story.js` 的对应章节里加 `game: { title, prompt }`（中文标题与说明）。
4. 在 `README.md` 的关卡表格里补一行。
5. 跑 `npm run check && npm run smoke && npm run check:i18n`。

## 验证

```bash
npm run smoke          # 无头跑通 6 章与全部新 phase
npm run check:i18n     # 中英文界面无漏译 / 无串漏
npm run build:single   # 重新生成单文件离线版
npm run smoke:single   # 验证单文件版
```

真机浏览器验证记录（390×844 Chromium）：6 个关卡均能在 `startScene()` 下绘制 700ms
无异常；中文／英文两种语言下标题、创建、地图、日志、角色卡、故事、关卡、隐藏物品、
弹窗均正常渲染。

---

# v0.3 — 更像冒险游戏的升级

## 绘画背景与天气

`src/engine/scene.js` 新增 `loadArt / drawBackdrop / drawWeather / shadow / npc`：

- `drawBackdrop(c, ctx, art, opts)` 把对应章节的 JPG 铺满画布，做 cover 缩放、缓慢视差平移、
  色彩分级压暗、三道暖色体积光束与暗角；矢量精灵画在其上，保持可读性。
- `drawWeather` 支持 `rain / sand / petals / leaves / embers / bubbles` 六种粒子天气。
- `shadow()` 给每个角色与道具画径向地面阴影；`npc()` 是营地与关卡里通用的斗篷人物精灵，
  支持袍色、头巾、呼吸起伏与光晕。
- 朝圣者也加了披风、轮廓光与面部高光。

每个关卡通过 `art` 与 `weather` 两个字段声明自己的背景与天气；`bg()` 统一处理。
新图：`camp.jpg / bush.jpg / ruth.jpg / jonah.jpg / zacchaeus.jpg`。

## 四个新关卡

| key | 章节 | 控制 | 目标 | 失败条件 |
|---|---|---|---|---|
| `desert` | 燃烧的荆棘 | 拖动行走（或 WASD／方向键） | 找齐 3 只羊，走到右侧燃烧的荆棘 | 30 秒沙暴合拢 |
| `glean` | 拾穗的麦田 | 拖动移动 | 收集 12 捆麦子 | 34 秒日落 / 3 次被镰刀碰到 |
| `deep` | 大鱼腹中 | 上下拖动游泳 | 游到岸边且接住 3 颗祷告气泡 | 3 次撞上礁石／水母 |
| `climb` | 爬上桑树 | 点屏幕左半／右半 | 按亮起的树枝抓稳 10 次 | 3 次点错或超时滑落 |

四关都遵守同一套引擎契约：`init / step / draw / onDown(可选)`，用 `c.end(success, score)` 结束，
用 `c.hurt()` / `c.addScore()` / `c.spark()` / `c.setHint()` 反馈。

## 营地、引导与沉浸模式

- 营地是章节之间的**overworld hub**（`src/screens/camp.js`），不是普通菜单：
  昼夜随章节推进、3 位可对话 NPC、3 个任务、行囊、营火呼吸祷告。
- **引导（Guidance）** 由祷告（每章 +1）、呼吸祷告（每日 +2）与任务奖励获得。
  它是「提示的货币」：在沉浸模式花 1 点显明一页提示，花 2 点穿过一个品格门槛。
- **沉浸／纯净模式** 隐藏 `choicesHtml` 里的 hint、tag、门槛说明与 `choice-aside`。
  锁定选项只给出「有些门要到后来才开」。这说明提示只是**脚手架**，不是故事的一部分——
  拆掉它，经文结局与终章完全不变。
- **终章**（`finaleHtml`）不给分数、不给清单：只有品格条、收集统计、一段关于「你成为怎样的人」
  的诚实文字和一节经文。这是对「如果去掉提示，结尾会怎样」的直接回答。

## 验证

```bash
npm run check:games   # mock canvas 逐帧跑完 10 个关卡的 step/draw，捕捉运行时错误
npm run check         # 10 章内容 / 链接 / 状态转移
npm run smoke         # 全程 10 章 + 营地 + 任务 + 呼吸祷告 + 沉浸模式 + 终章 + 重置
npm run check:i18n    # 两种语言（含营地、终章与新弹窗）
npm run build && npm run smoke:single
```

---

# v0.4 — 从「一个小游戏」到「多幕互动场景」

## 为什么改

反馈很直接：大卫那一章「只是把石头丢向歌利亚」，而「找五块石头」只是点五个发光点，
太容易也太单薄。所以 v0.4 做了三件事：**加幕**、**加搜寻难度**、**加画面层次**。

## 多幕框架

`src/engine/stages.js` 的 `withStages(game, preludes)` 把原本的一个游戏包装成
`[准备幕…, 原游戏]`。做法是**临时接管 `c.end`**：

- 原游戏照旧调用 `c.end(success, score)`；
- 若 `success` 且还有下一幕，包装器不结束场景，而是播放「ACT CLEAR」过场、
  回复生命值、初始化下一幕；
- 只有最后一幕的 `c.end` 才会真正回到剧情。

准备幕**永不阻断剧情**：超时或失误会调用 `c.end(true, …)` 软成功进入下一幕，只是分数较低。
`c.progress` 被换算成 `(当前幕 + 本幕进度) / 总幕数`，HUD 进度条因此贯穿整个场景。

六种准备幕（`kind`）：

| kind | 操作 | 用在 |
|---|---|---|
| `sift` | 拖动提灯拂开沙土格，从隐藏物中挑出真品；假物扣时间 | 摩西（3 只羊）、路得（麦穗）等 |
| `rhythm` | 光点穿过金色标记时点击，逐轮加速、目标变窄 | 但以理守夜、路得跟上收割节奏 |
| `trace` | 手指沿弯曲道路拖到顶端，离开路会掉时间 | 耶利哥山路、浪子回家路 |
| `charge` | 按住蓄力，在移动的金色区间里松手 | 风浪拉缆绳、约拿屏息下潜 |
| `order` | 看亮起的印记顺序再点回来，两轮递增 | 以斯帖谕旨、撒该看树枝 |
| `dodge` | 点击跳过不断飞来的长枪，跑向阵前 | 大卫第二幕（专属） |

**大卫三幕**：`charge`（练习甩石）→ `dodge`（穿过长枪）→ `sling`（甩石）。

溪边故事节点的**提灯搜寻**决定弹药：`hotspotTap / hotspotSkip` 把找到的数量记在
`ui.story.hotspotFound[nodeId]`，`mountActionScene` 通过 `startScene(..., seed)` 传入，
`withStages.init` 保留 `c.shared`，最后 `sling.init` 用 `clamp(c.shared.stones, 2, 5)`
决定石子数——**搜寻的结果真的会带进战斗**。跳过或灯火燃尽就只能用 2–4 发面对歌利亚。

## 提灯搜寻（隐藏物品重做）

`src/screens/story.js` 的 `hotspots` 阶段重写：

- 画面被 `0 0 0 2000px` 的巨大 box-shadow 压暗，只有半径 78px 的**提灯光圈**可见；
- 隐藏物默认 `opacity: .045` 且模糊，只有被灯照到才 `.lit` 显形；
- 只有**拖动**（pointermove 且按下）才移动灯，单纯点击不会帮你照亮，避免退化成「乱点一通」；
- 混入 5–6 个**假物**（浅灰、去饱和），点错或点到未照亮处会消耗 3 点「专注」；
- 28 秒灯火倒计时，燃尽自动跳过（无奖励但剧情继续）。

## 电影感画面

`src/engine/visual.js` 提供 `drawForeground / drawCinematic / drawStageBadge / goldenHour`，
在每幕 `draw` 之后统一叠加：胶片颗粒、信箱黑边、金色发丝线、四角装饰、前景剪影
（岩石／沙丘／麦秆／树枝／人群／波浪／石柱），以及「ACT n/N」徽章。

`src/data/portraits.js` 把全部 10 章的 cast 映射到 6 张立绘；对白框小头像与场景大头像
都换成真实人物插画。耶稣与神的声音使用**非具象的光之人形**——是否直接描绘基督
仍是留给团队的决定。

## 验证

```bash
npm run check:games   # mock canvas 逐帧跑完 10 个多幕场景的每一幕 step / draw
npm run check && npm run smoke && npm run check:i18n
npm run build && npm run smoke:single
```
