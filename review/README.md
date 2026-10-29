# 中文台本审阅 / Chinese copy review

The Chinese script, ready to hand out and take back.

## 文件在哪 / Where the files are

Live copies on GitHub (this repo is public):

- **All story lines** — [`zh-story.tsv`](https://github.com/fongway94/Covenant/blob/arena/c138bec0-covenant/review/zh-story.tsv) · [raw download](https://raw.githubusercontent.com/fongway94/Covenant/arena/c138bec0-covenant/review/zh-story.tsv)
- **Interface strings** — [`zh-ui.tsv`](https://github.com/fongway94/Covenant/blob/arena/c138bec0-covenant/review/zh-ui.tsv)
- **One file per chapter** — [`chapters/`](https://github.com/fongway94/Covenant/tree/arena/c138bec0-covenant/review/chapters) ← start here

| chapter | lines |
|---|---|
| [01 以拉谷](https://raw.githubusercontent.com/fongway94/Covenant/arena/c138bec0-covenant/review/chapters/01-elah.tsv) | 67 |
| [02 狮子坑](https://raw.githubusercontent.com/fongway94/Covenant/arena/c138bec0-covenant/review/chapters/02-lions.tsv) | 71 |
| [03 耶利哥路上](https://raw.githubusercontent.com/fongway94/Covenant/arena/c138bec0-covenant/review/chapters/03-jericho.tsv) | 84 |
| [04 湖上风浪](https://raw.githubusercontent.com/fongway94/Covenant/arena/c138bec0-covenant/review/chapters/04-storm.tsv) | 64 |
| [05 远方](https://raw.githubusercontent.com/fongway94/Covenant/arena/c138bec0-covenant/review/chapters/05-prodigal.tsv) | 90 |
| [06 以斯帖](https://raw.githubusercontent.com/fongway94/Covenant/arena/c138bec0-covenant/review/chapters/06-esther.tsv) | 77 |
| [07 荆棘](https://raw.githubusercontent.com/fongway94/Covenant/arena/c138bec0-covenant/review/chapters/07-bush.tsv) | 58 |
| [08 路得](https://raw.githubusercontent.com/fongway94/Covenant/arena/c138bec0-covenant/review/chapters/08-ruth.tsv) | 48 |
| [09 约拿](https://raw.githubusercontent.com/fongway94/Covenant/arena/c138bec0-covenant/review/chapters/09-jonah.tsv) | 49 |
| [10 撒该](https://raw.githubusercontent.com/fongway94/Covenant/arena/c138bec0-covenant/review/chapters/10-zacchaeus.tsv) | 49 |

## 格式 / Format

Four columns, tab-separated:

```
ID                        SPEAKER   ENGLISH ORIGINAL                  CHINESE
ch.elah.start.R0                    Your legs do not feel brave...    你一点也不觉得自己勇敢，可你还是...
```

Rewrite **only the fourth column**. Keep the ID exactly. Delete rows you're happy with, or leave them unchanged.

## 给 ChatGPT 的说明 / Prompt to paste above the file

> 这是游戏《圣约》的中文台本。第二列是说话人，第三列是英文原文，第四列是现在的中文。请只改第四列，保留第一列的 ID。
>
> 标准：句子要自己把意思说清楚，读者不用猜。不要格言式的压缩句，不要让抽象名词担推动词的活，不要把英文的比喻逐字搬过来。
>
> 可以参考这个语感：「怜悯不只是一个感觉而已，是要付上代价的。」
>
> 只返回你改过的行，格式不变。

## 收回 / Coming back

Save the returned file, then:

```bash
node tools/zh-review.js apply review/chapters/01-elah.tsv
npm run check:copy && npm run check:i18n && npm run smoke
```

The apply step finds each old Chinese string in the source and swaps it for yours. It refuses any row whose old text is not unique, so it cannot hit the wrong line. Nothing else in the repo is touched.

## 已经定稿、不要改的行 / Lines already approved by the player

These are locked; `tools/check-copy.js` keeps a keep-list for them.

- 怜悯不只是一个感觉而已，是要付上代价的
- 你没有催促他，也没有急着劝他，只是安静地留在他身边。因为有时候，一个人最需要的，不是有人告诉他该怎么走出来，而是有人愿意陪着他，等他慢慢走出来
- 撒该肯四倍偿还，是因为他先被接纳了，不是为了换取接纳
- 你没有跑。勇敢就是这样：心里怕，可你没有跑
- 波阿斯多留的那几把麦穗，成了这段爱情的开头
- 结伴走，留意四周
- 故事讲到这里，就不那么好听了
- 这是你今天做过最诚实的一件事
- 分辨力，就是分得清哪些帮助真的适合你
- 敬畏和好奇，本来就不冲突
- 别人只顾赶路，你会停下来把眼前这一处看清楚；路也就一点一点向你打开
- 而那次观看，成了信心的起点
- 爱是一个方向。她已经选好了
- 书卷合上了，合在一个问题上，而不是一个答案上
- 在圣经里都有真实的地址
- 许多伟大的故事，就是从一个很小的「不肯」开始的
- 在那样一个时刻
- 站在旁边看见恩典的人，都是这样
- 路得的忠心，是在一块不属于她的田里，每天早晨重复同一个决定
- 但以理的勇气不是呐喊，而是一个在法律改变时也没有改变的祷告习惯
