# 森家の猫日記

バカちんとをぴの毎日の写真・食事・排便を記録するアプリです。Firestoreにデータを保存し、LINEミニアプリ(LIFF)として動かせます。

## 1. Firestoreのセキュリティルールを設定する

1. Firebaseコンソール → 対象プロジェクト → 「構築」→「Firestore Database」→「ルール」タブを開く
2. `firestore.rules` の中身をそのまま貼り付けて「公開」をクリック

これをしないと、テストモードの期限(数週間)が切れた時点でアプリが使えなくなります。

## 2. ローカルで動作確認する(任意)

```
npm install
npm run dev
```

表示されたURL(`http://localhost:5173`など)をブラウザで開いて、写真アップロードやカレンダーが動くか確認できます。この段階ではLINE不要です。

## 3. Vercelにデプロイする

1. https://vercel.com にGitHubアカウントなどでログイン
2. このフォルダをGitHubリポジトリにpushしておく
3. Vercelで「New Project」→ そのリポジトリを選択 →「Deploy」
4. デプロイが終わると `https://xxxx.vercel.app` のようなURLが発行される

## 4. LINE DevelopersでLIFFチャネルを作る

1. https://developers.line.biz/console/ にログイン(お使いのLINEアカウントでOK)
2. プロバイダーを作成(まだなければ)
3. 「新規チャネル作成」→「LINEミニアプリ」または「LIFF」を選択
4. チャネル作成後、「LIFF」タブ→「追加」
   - サイズ: Full
   - エンドポイントURL: 手順3で発行されたVercelのURL
5. 作成すると「LIFF ID」が発行されるので、それをコピー

## 5. LIFF IDをアプリに設定する

- Vercelのプロジェクト設定 →「Environment Variables」→
  - Key: `VITE_LIFF_ID`
  - Value: 手順4でコピーしたLIFF ID
- 設定後、Vercelで再デプロイ(Redeploy)する

## 6. 使ってみる

LINEで、発行されたLIFF URL(`https://liff.line.me/xxxxxxx`の形式、LINE Developersの「LIFF」タブに表示されています)を家族に送り、タップして開いてもらえば完成です。

---

### データ保存の仕組み(参考)

- `meta/cats`: 猫のプロフィール(名前など)
- `index/{catId}`: カレンダー表示用の日付ごとの簡易記録
- `entries/{catId}_{date}`: 写真・食事・排便・メモの本体データ

家族全員が同じデータベースを見るので、誰が記録しても全員のカレンダーに反映されます。
