# Lynn 课堂 v2

课堂积分 / 考勤 / 点名系统。页面托管在 GitHub Pages，数据在 Supabase（与 A-Level / SAT 站共用同一项目，表前缀 `cls_`）。

```
site/        网页（index.html / app.js / db.js / style.css / config.js）
supabase/    schema.sql 建表；seed.sql 初始数据（不入库，含真实姓名）
migrate/     build_seed.py：旧系统 JSON + Google Sheets CSV → seed.sql / dev-seed.json
design/      设计稿源文件（.dc.html）
```

## 本地预览

`python3 -m http.server 8765 --directory site` 后开 `http://localhost:8765/?dev` —— 用 `dev-seed.json`，写操作只进 localStorage，不碰后台。

## 上线 / 更新

推到 GitHub，Pages 从 `site/` 发布。改完 `git push` 即生效（1–2 分钟）。

## 数据规则

- 分数：每学季从 100 起，= 100 + 本季 `cls_events.delta` 之和
- 点名次数：本季 `kind='called'` 或 `delta>0` 的事件数
- 上季度风险点：上季 `cls_exams` 有 F → 红点，有 D → 橙点
- 考勤：一人一天一行，`flags` 可多选；导出分「出勤」和「摄像头/回应」两栏
- 新学季：菜单 → 开始新学季（只改 `cls_settings.current_term`，旧数据全留）
- 成绩：菜单 → 导入考试成绩，从 Google Sheets 表头行「学号」起复制粘贴；同名覆盖
