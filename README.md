# Jev vs OpenAI Decisions API — 日本語ベンチマーク

TypeSafe **Jev** と OpenAI **Decisions API** を、同一の日本語 decision dataset で比較するためのベンチマークです。

OpenAI Decisions API の一般公開前にデータセットを固定し、公開後に評価条件を後付けで変更しないことを目的としています。

## 現在の状態

- Jev adapter: 実装済み
- OpenAI Decisions API adapter: stub
- 日本語 dataset v1: **260件**
- OpenAI Decisions API: 2026-09-30 時点では limited preview のため、未公開 schema は推測していません

## 評価項目

- Accuracy
- Macro F1
- Multiclass Brier score
- ECE (Expected Calibration Error)
- latency p50 / p95 / p99
- input / output token usage

probability / confidence を提供しない API の場合、その指標は `-` として扱います。

## Dataset

`datasets/japanese-decision-v1/` 配下に JSONL shard として固定しています。

| Task | Cases |
|---|---:|
| support-routing | 60 |
| agent-action | 80 |
| risk-review | 60 |
| model-routing | 60 |
| **Total** | **260** |

含めている例:

- 日本語の通常表現
- 口語
- 曖昧な問い合わせ
- typo
- 日本語・英語混在
- 高影響操作
- 社内情報検索が必要なケース
- agent/tool routing
- reasoning量によるmodel routing

## セットアップ

Bun を使用します。

```bash
bun install
cp .env.example .env
```

Jev の API key を設定します。

```bash
export JEV_API_KEY=...
```

dataset の整合性確認:

```bash
bun run check
```

Jev を10件だけ実行:

```bash
bun run src/runner.ts \
  --adapter jev \
  --dataset datasets/japanese-decision-v1 \
  --limit 10 \
  --concurrency 2
```

全件:

```bash
bun run bench:jev
bun run report
```

## OpenAI Decisions API 公開後

`src/adapters/openai-decisions.ts` のみ、OpenAI の公式 request / response schema に合わせて実装します。

その後:

```bash
export OPENAI_API_KEY=...
export OPENAI_DECISIONS_ENDPOINT=...
export OPENAI_DECISIONS_MODEL=...

bun run bench:openai
bun run report
```

## 再現性

検証時には以下を保存してください。

- repository commit hash
- dataset SHA-256
- API / model version
- 実行日時
- concurrency
- 実行リージョン

各 shard の SHA-256 は `datasets/japanese-decision-v1.sha256` に記録しています。

公開前に生成した単一 JSONL の canonical SHA-256 は次です。

```text
2c083571017468960a2807291be4b71989801f2f1bc5708f6a6e1e79aa3a5271
```

## 構成

```text
.
├── datasets/
│   ├── japanese-decision-v1/
│   │   ├── agent-action-*.jsonl
│   │   ├── model-routing.jsonl
│   │   ├── risk-review-*.jsonl
│   │   └── support-routing-*.jsonl
│   └── japanese-decision-v1.sha256
├── src/
│   ├── adapters/
│   │   ├── jev.ts
│   │   └── openai-decisions.ts
│   ├── check-dataset.ts
│   ├── load-dataset.ts
│   ├── metrics.ts
│   ├── report.ts
│   ├── runner.ts
│   └── types.ts
└── package.json
```

## 参照元

- OpenAI Developer Community — DevDay 2026 announcements / Decisions API limited preview
- TypeSafe Jev OpenAPI — `POST /v1/systemone`, choice, confidence, probabilities, token usage

## License

Dataset / benchmark code のライセンスは今後明示します。
