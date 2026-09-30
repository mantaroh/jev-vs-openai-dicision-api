# OpenAI Decisions API vs Jev 日本語ベンチマーク

OpenAI Decisions API と TypeSafe Jev を、同一の日本語 decision dataset で比較するための固定ベンチマークです。

## 方針

- API 固有処理は `src/adapters/` に隔離する。
- データセットは API 公開前に `v1` として固定し、公開後に正解ラベルを変更しない。
- Accuracy だけでなく Macro F1 / Brier score / ECE / p50,p95,p99 latency を比較する。
- probability を返さない API の場合、Brier/ECE は `-` とする。
- OpenAI Decisions API は 2026-09-30 時点で limited preview。公開 schema を推測せず stub にしている。

## セットアップ

```bash
cp .env.example .env
# .env に JEV_API_KEY を設定
set -a; source .env; set +a
bun run check
bun run bench:jev
bun run report
```

少量で疎通確認:

```bash
bun run src/runner.ts --adapter jev --dataset datasets/japanese-decision-v1.jsonl --limit 10 --concurrency 2
```

OpenAI Decisions API 公開後:

1. 公式 schema に基づき `src/adapters/openai-decisions.ts` を実装。
2. `.env` に必要な endpoint/model を設定。
3. `bun run bench:openai`。
4. `bun run report`。

## Dataset

`datasets/japanese-decision-v1.jsonl` は4タスクを混在させています。

- `support-routing`: 問い合わせ振り分け
- `agent-action`: AIエージェントの次アクション
- `risk-review`: 操作のリスク判定
- `model-routing`: fast / balanced / reasoning のモデルルーティング

各ケースには `tags` があり、口語、曖昧表現、誤字、敬語、混在言語、短文などを後から slice 評価できます。

## 公開時に固定すべきもの

検証時は commit hash、dataset SHA-256、API/model version、実行日時、concurrency、リージョンを記録してください。モデル更新の影響と API 差分を分離できます。

## 参照元

- OpenAI Developer Community, DevDay 2026 announcements: Decisions API is in limited preview and uses Luna for classification/routing/action selection.
- TypeSafe OpenAPI 0.2.0: `POST /v1/systemone`, `choice` question, `confidence`, per-choice `probabilities`, token usage.
