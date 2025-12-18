# rami-actions

GitHub Action for AI code reviews using [Rami](https://rami.reviews).

## Usage

```yaml
name: Rami Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  pull-requests: write
  contents: read

jobs:
  review:
    if: github.event.pull_request.draft != true
    runs-on: ubuntu-latest
    steps:
      - uses: rami-code-review/actions@v1
        with:
          api_key: ${{ secrets.RAMI_API_KEY }}
```

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `api_key` | Yes | Rami API key ([get one here](https://rami.reviews/console)) |

## Outputs

| Output | Description |
|--------|-------------|
| `issues_found` | Number of issues found in the review |
