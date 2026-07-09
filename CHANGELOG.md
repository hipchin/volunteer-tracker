# CHANGELOG

## 2026-07-09 - performance-1

### Added

- 起動高速化のため、月別・年度別の集計結果をメモリ上で再利用する `sessionStatsCache` を追加。
- 記録データの互換補完済み状態を保存する `vt_sessions_normalized_version` を追加。
- 起動後の遅延処理 `initDeferredStartupTasks()` を追加。
- 更新前安全バックアップの保存日時キーを追加。

### Changed

- 起動時に毎回全記録を補完走査し続けないよう、`loadSessions()` の処理を調整。
- 月別・年度別集計で毎回 `state.sessions.filter()` を繰り返さないよう変更。
- 目標達成判定と奉仕報告通知を初期描画後に遅延実行するよう変更。
- `index.html` のCSS/JSバージョンクエリを `20260709-1` に更新。
- `README.md` に起動高速化と追加保存キーの説明を追記。

### Fixed

- 記録件数が増えた場合に、起動時・集計時の処理負荷が増えやすい構造を改善。
- 最新版読み込み時、更新前安全バックアップの作成失敗に気づけない問題を改善。

### Removed

- なし。
