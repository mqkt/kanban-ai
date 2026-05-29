これは、[`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) で作成された [Next.js](https://nextjs.org) のプロジェクトです。

## はじめに

まず、開発サーバーを起動します。

```bash
npm run dev
# または
yarn dev
# または
pnpm dev
# または
bun dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて、結果を確認してください。

`app/page.tsx` を編集し始めると、ページが自動的に更新されます。

このプロジェクトは [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) を使用して、Vercel の新しいフォントファミリーである [Geist](https://vercel.com/font) を自動的に最適化してロードしています。

---

## Docker での動かし方

本プロジェクトには、Docker および Docker Compose を使用してコンテナ環境で動かすための設定が含まれています。本番環境を模した環境での動作確認や、ローカル開発環境の構築に利用できます。

### 1. ビルドと起動
以下のコマンドを実行すると、マルチステージビルドを使用して最適化（軽量化）された Docker イメージが作成され、コンテナがバックグラウンドで起動します。

```bash
docker compose up --build -d
```

### 2. 動作確認
コンテナが起動したら、ブラウザで以下にアクセスしてください。
* [http://localhost:3000](http://localhost:3000)

### 3. コンテナの停止
コンテナを停止して削除するには、以下のコマンドを実行します。

```bash
docker compose down
```

### 4. 次回以降の起動（再ビルドなし）
すでにイメージのビルドが完了している場合は、`--build` なしで瞬時に起動できます。

```bash
docker compose up -d
```

---

## 詳細情報

Next.js についてさらに詳しく学ぶには、以下のリソースを参照してください。

* [Next.js ドキュメント](https://nextjs.org/docs) - Next.js の機能や API について学べます。
* [Next.js を学ぶ (インタラクティブチュートリアル)](https://nextjs.org/learn) - インタラクティブな Next.js のチュートリアルです。

[Next.js の GitHub リポジトリ](https://github.com/vercel/next.js) もぜひご覧ください。フィードバックや貢献を歓迎しています！

## Vercel へのデプロイ

Next.js アプリをデプロイする最も簡単な方法は、Next.js の開発元が提供している [Vercel プラットフォーム](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) を使用することです。

詳細については、[Next.js デプロイメントドキュメント](https://nextjs.org/docs/app/building-your-application/deploying) を参照してください。
