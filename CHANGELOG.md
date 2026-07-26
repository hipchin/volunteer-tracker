# CHANGELOG

## 2026-07-26 - no-startup-log-1

### Removed

- 起動時間の実測ログ表示機能を削除。設定画面の「起動時間（直近）」項目、`recordStartupPerf` / `loadStartupPerf`、起動完了時の計測呼び出しを撤去。不要と判断したため。
- `vt_startup_perf` への書き込みは停止。既存端末に残っている可能性のある `vt_startup_perf` キー自体は無害な診断データのため、能動的な削除は行わない（削除しない、というルールに従う）。

### Changed

- `index.html` のJSバージョンクエリ、`js/app.js` 内の `APP_VERSION` / `VT_APP_BUILD` / `VT_APP_VERSION_LABEL`、`sw.js` の `CACHE_VERSION` / `APP_SHELL` を `20260726-3` に同期。

## 2026-07-26 - update-banner-1

### Added

- 新しいバージョンがバックグラウンドで取得・適用された際に「新しいバージョンがあります」バナーを表示する機能を追加。「今すぐ更新」でその場でページを再読み込みして反映、「あとで」で非表示にできる。
- 検出方法は `navigator.serviceWorker` の `controllerchange` イベント。初回インストール時（まだ制御中のService Workerが存在しない状態からの初回制御開始）はバナーを出さないよう、ページ読み込み開始時点で既にService Workerに制御されていたかどうかを `vtHadControllerAtLoad` で判定してから表示する。

### Changed

- `index.html` のJSバージョンクエリ、`js/app.js` 内の `APP_VERSION` / `VT_APP_BUILD` / `VT_APP_VERSION_LABEL`、`sw.js` の `CACHE_VERSION` / `APP_SHELL` を `20260726-2` に同期。

## 2026-07-26 - bundle-1

### Added

- 起動時間を計測して端末内に直近5回分を記録する仕組み（`vt_startup_perf`）を追加。設定画面の「アプリ情報」に直近値と平均値を表示する。実機で体感を数値で確認できるようにするための診断用ログで、記録データではないためバックアップ対象には含めない。

### Changed

- `css/style.css` と `js/storage.js` / `js/time.js` / `js/ui.js` / `js/app.js` / `js/app-version.js` / `js/carryover-update.js` を、`index.html` へのインラインCSSと単一の `js/app.js` へ統合。読み込みリクエスト数を7（HTML+CSS+JS5本）から2（HTML+JS1本）へ削減し、Service Worker経由の起動時に発生していたキャッシュ照合の往復回数を減らした。
- 各ファイルの役割分担はそのまま維持し、統合後の `js/app.js` 内にセクション区切りコメントを残した。
- `index.html` のJSバージョンクエリ、`js/app.js` 内の `APP_VERSION` / `VT_APP_BUILD` / `VT_APP_VERSION_LABEL`、`sw.js` の `CACHE_VERSION` / `APP_SHELL` を `20260726-1` に同期。

### Removed

- `css/style.css`、`js/storage.js`、`js/time.js`、`js/ui.js`、`js/app-version.js`、`js/carryover-update.js` を単体ファイルとしては削除（内容は `index.html` / `js/app.js` へ統合済み）。

### Note

- 起動速度そのものについては、iOSのWKWebView・Service Workerのコールドスタートというアプリコード側では削減できないOS側のオーバーヘッドが体感速度の主要因になっている可能性がある。今回追加した起動時間ログで、統合前後・実機での体感差を数値で確認できるようにした。

## 2026-07-15 - fast-start-1

### Added

- HTML・CSS・JavaScript・manifest・アプリアイコンを端末内へ保存するアプリシェルキャッシュを追加。
- 初回読み込み中にアプリアイコンとアプリ名を表示する起動画面を追加。
- キャッシュ済みアプリシェルによるオフライン起動を追加。

### Changed

- Service Workerを毎回ネットワーク取得する方式から、キャッシュ済みファイルを優先する方式へ変更。
- 画面遷移時はキャッシュ済みHTMLを即時表示し、最新版をバックグラウンドで取得する方式へ変更。
- アプリバージョンとCSS・JavaScriptのクエリを `2026.07.15.fast-start-1` / `20260715-1` へ更新。
- Service Worker有効化時は、現在使用中のキャッシュを残して旧バージョンだけを削除する方式へ変更。
- 更新時に削除するキャッシュとService Worker登録を、このアプリの範囲だけに限定。

### Fixed

- 起動のたびに全ファイルをネットワークから再取得し、通信状態によって約5秒の白画面が発生し得る問題を修正。
- JavaScriptとCSSの読み込み前に白一色が表示される問題を、インライン起動画面で改善。
- 同じGitHub Pagesドメイン上の別PWAのキャッシュやService Worker登録へ影響し得る更新処理を修正。
- 更新前安全バックアップに失敗した場合、更新処理を中止するよう修正。

### Removed

- 全GETリクエストへ `cache: 'no-store'` を指定するキャッシュ禁止処理を削除。

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
