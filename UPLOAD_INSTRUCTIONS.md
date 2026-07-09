# アップロード手順

## 1. アップロードするファイル

以下のファイルをGitHubリポジトリ `hipchin/volunteer-tracker` の同じ場所へアップロードしてください。

```text
index.html
css/style.css
js/storage.js
js/time.js
js/ui.js
js/app.js
js/app-version.js
README.md
CHANGELOG.md
TODO.md
```

`js/carryover-update.js` は今回のZIPには含めていません。既存ファイルをそのまま使います。`index.html` 側の読み込みURLは `?v=20260709-1` に更新されていますが、既存の `js/carryover-update.js` がGitHub上に残っていればそのまま読み込まれます。

## 2. PROJECT_CONTEXT.mdについて

`PROJECT_CONTEXT_APPEND_20260709.md` は、既存の `PROJECT_CONTEXT.md` の末尾へ追記する内容です。

既存の `PROJECT_CONTEXT.md` を丸ごと置き換えないでください。

理由は、既存の仕様メモが長く、消すと今後の保守情報が失われるためです。

## 3. 推奨アップロード順

1. `js/storage.js`
2. `js/time.js`
3. `js/ui.js`
4. `js/app.js`
5. `js/app-version.js`
6. `css/style.css`
7. `index.html`
8. `README.md`
9. `CHANGELOG.md`
10. `TODO.md`
11. `PROJECT_CONTEXT.md` の末尾に `PROJECT_CONTEXT_APPEND_20260709.md` の内容を追記

## 4. アップロード後の確認

1. GitHub Pagesの反映を待つ
2. アプリを開く
3. 設定タブを開く
4. 「現在のバージョン」が `2026.07.09.performance-1` になっているか確認
5. 「最新版を読み込む」を押す
6. iPhone Safariで起動確認
7. ホーム画面追加済みPWAで起動確認
8. 記録追加・編集・削除後にトップ画面と集計画面の数字が正しいか確認

## 5. データ保護

今回の修正では `vt_sessions` を削除しません。

復元操作が必要になる移行も行いません。

最新版読み込み前には `vt_pre_update_backup` が端末内に作成されます。

今回追加される `vt_sessions_normalized_version` は、既存記録データの互換補完済み状態を示すための管理キーです。記録本体ではありません。
