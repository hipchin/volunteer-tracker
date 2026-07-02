# 奉仕時間記録 (Volunteer Tracker)

スマートフォン向けのPWA（Progressive Web App）として動作する、奉仕時間記録アプリです。

GitHub Pages上で動作し、サーバーを使用せず、端末内（localStorage）にデータを保存します。

---

# 主な機能

- 奉仕時間のタイマー計測
- 手動入力
- 開始・終了時刻の修正
- 中断時間の差し引き
- 野外奉仕 / その他の奉仕の分類
- 月別履歴
- 記録の編集・削除
- 月次集計
- 年度集計（9月〜翌8月）
- レッスン件数記録
- 月次目標
- 年次目標
- JSONバックアップ
- JSON復元
- PWA対応
- ホーム画面追加対応（iPhone / Android）

---

# 技術構成

|項目|内容|
|----|----|
|Frontend|HTML / CSS / JavaScript|
|Backend|なし|
|Hosting|GitHub Pages|
|Database|localStorage|
|PWA|対応|
|Framework|未使用（Vanilla JavaScript）|

---

# ディレクトリ構成

```text
index.html
manifest.json
sw.js

css/
    style.css

js/
    storage.js
    time.js
    ui.js
    app.js

PROJECT_CONTEXT.md
README.md
```

---

# データ保存

データはブラウザの localStorage に保存されます。

サーバーには一切保存されません。

バックアップはJSON形式で保存・復元できます。

---

# 対応環境

- iPhone Safari
- iPhone ホーム画面追加
- Android Chrome
- PC Chrome
- PC Edge

---

# 開発方針

- スマホファースト
- iPhone Safariを最優先
- PWAとして快適に動作することを重視
- サーバーレス構成を維持
- localStorage互換性を維持
- 既存ユーザーデータを破壊しない

---

# 開発者向け

設計情報は以下を参照してください。

PROJECT_CONTEXT.md

このファイルには

- システム構成
- データ構造
- localStorage仕様
- PWA仕様
- 修正時の注意事項

をまとめています。

コード修正前に必ず確認してください。

---

# ライセンス

Private Repository
