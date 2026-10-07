# Lynn 课堂 v2

课堂积分 / 考勤 / 点名系统。页面托管在 GitHub Pages，数据在 Supabase（与 A-Level / SAT 站共用同一项目，表前缀 `cls_`）。

```
site/        网页（index.html / app.js / db.js / style.css / config.js；成绩簿：gradebook.js 界面 + gbcalc.js 算法 + gbtable.js 官方换算表；学生自查：s.html / s.js）
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

## 成绩簿（2026-10-07 起）

菜单顶栏「成绩」：总览 / 录分 / 分布 / 表现 / 设置。先在 Supabase 跑一遍 `supabase/gradebook.sql`（可重复执行；没跑之前页面照常能用，只是表现记录和手调综评存不下来）。

- 配置存在 `cls_settings.gb_config["班级|学季"]`：分类（= 学校 A1–A4 综评）→ 小组（同组考核项取平均）→ 考核项；十年级有 `std`（100%）和 `xce`（Xavier 40%）两条线，学生归属在 `gb_track`。
- 换算：有满分的卷子查官方 Transmutation Table（`gbtable.js`，满分不在表里取不超过它的最近一行）；百分比、综评、总等级用满分 100 那行（95/88/81/74/67/60）；口语考试 总分÷5；边界分取高档。等级→分值 A+97 A93 B+87 B83 C75 D63 F50。
- 等级手调：`cls_exams.override=true` 时 `grade` 不再被自动值覆盖；综评/总等级手调存 `cls_term_report.overrides`。
- 学生自查：`s.html` → RPC `cls_student_view(班级, 学号, 中文名, 个人码)`，只返回本人**当前学季**的课堂分 + 老师设为「对学生可见」（考核项 `show=true`，默认关）的单项成绩；不返回综评、总评/Final grade（学校成绩系统统一公布）、旧学季；`cls_settings.student_view[班级]` 控制是否开放；个人码在 `cls_students.pin`，连错 5 次锁 15 分钟。
- 算法测试：`node migrate/test_gbcalc.mjs`。
