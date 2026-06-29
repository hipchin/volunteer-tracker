# volunteer-tracker split version

## アップロード方法
GitHub Pages の公開元が main / root の場合、ZIPを解凍して中身をリポジトリ直下へアップロードしてください。

アップロードする主なファイル:
- index.html
- manifest.json
- sw.js
- css/style.css
- js/storage.js
- js/time.js
- js/ui.js
- js/app.js
- volunteer_tracker.html（旧URLからindex.htmlへ転送するためのファイル）

## 互換性
既存のlocalStorageキーを維持しています。
- vt_sessions
- vt_goal
- vt_lessons
- vt_reported_months
- vt_goal_status
- vt_active_timer

## 注意
元の volunteer_tracker.html は削除せず、まず残しておくことを推奨します。
index.htmlで問題なく動くことを確認してから、古いファイルを整理してください。
