# Japanese Decision Model Benchmark

日本語の decision model を、固定された同一データセットで比較するベンチマークです。精度だけでなく、確率の校正、レイテンシ、トークン使用量、口語・typo・日本語と英語の混在などへの頑健性を測定します。

OpenAI Decisions API の一般公開前にデータセットを固定し、公開後に評価条件を後付けで変更しないことを目的としています。

## 現在の状態

- TypeSafe Jev adapter: 実行可能 (`bun run bench:jev`)
- Cloudflare Clef adapter: 実行可能 (`bun run bench:clef`)
- Cloudflare Clef-flash adapter: 実行可能 (`bun run bench:clef-flash`)
- OpenAI Decisions API adapter: 公開待ち stub (`bun run bench:openai`)
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

dataset の整合性確認と静的チェック:

```bash
bun run check
bun run typecheck
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
bun run bench:clef
bun run bench:clef-flash
bun run report
```

### Cloudflare Workers AI

Clef と Clef-flash は、Workers AI の公式 REST API を利用します。Workers AI 実行権限を持つ API token と Account ID を設定してください。

```bash
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_API_TOKEN=...

bun run bench:clef
bun run bench:clef-flash
```

各アダプタは次の公式 endpoint に `model`、`state`、`questions` を直接渡します。

```text
POST https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/@cf/cloudflare/{clef|clef-flash}
```

Cloudflare API が返す `result` envelope は共通の System One 互換層で展開するため、Jev と同じ結果形式で Accuracy、校正、レイテンシ、token usage を比較できます。

## OpenAI Decisions API 公開後

`src/adapters/openai-decisions.ts` のみ、OpenAI の公式 request / response schema に合わせて実装します。

公開後は公式 schema に実装を置き換えたうえで、次を実行します。

```bash
export OPENAI_API_KEY=...
export OPENAI_DECISIONS_ENDPOINT=...
export OPENAI_DECISIONS_MODEL=...

bun run bench:openai
bun run report
```

## レポート

各実行は `results/{adapter}.jsonl` と `results/{adapter}.summary.json` を作成します。実行済みのアダプタを横並びで比較するには、次を実行します。

```bash
bun run report
```

`results/report.md` は Accuracy、Macro F1、Brier、ECE、p50/p95/p99 latency、input/output token usage を比較します。未実行のアダプタは表に含めません。

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
├── results/
├── src/
│   ├── adapters/
│   │   ├── system-one.ts
│   │   ├── jev.ts
│   │   ├── cloudflare-clef.ts
│   │   ├── cloudflare-clef-flash.ts
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

- [Cloudflare Clef model documentation](https://developers.cloudflare.com/workers-ai/models/clef/)
- [Cloudflare Workers AI REST API](https://developers.cloudflare.com/workers-ai/get-started/rest-api/)
- TypeSafe Jev OpenAPI — `POST /v1/systemone`, choice, confidence, probabilities, token usage

## License

Dataset / benchmark code のライセンスは今後明示します。
