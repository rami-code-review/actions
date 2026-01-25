# Rami Code Review Action

Wait for AI-powered code review results on your pull requests. This GitHub Action integrates [Rami](https://rami.review) into your CI/CD pipeline to report on code review findings.

## How It Works

1. **Webhook-triggered reviews**: When you push to a PR, the Rami GitHub App automatically triggers a review via webhooks
2. **This action waits**: The action polls for the review to complete and reports the results
3. **CI integration**: Results appear as GitHub annotations and action outputs

The action does NOT trigger reviews - it only waits for and reports on webhook-initiated reviews.

## Prerequisites

1. **Rami GitHub App**: Install the [Rami GitHub App](https://github.com/apps/rami-code-remeow) on your repository
2. **Organization Setup**: Your organization must be registered with Rami

## Usage

### Basic Usage

```yaml
name: Rami Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write
  id-token: write  # Required for OIDC authentication

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Rami Code Review
        uses: rami-code-review/actions@v1
```

### With Custom Failure Threshold

```yaml
- name: Rami Code Review
  uses: rami-code-review/actions@v1
  with:
    # Fail the action if issues at this severity or above are found
    # Options: blocking, high, medium, low, none
    fail_on: 'high'
```

### Using Outputs

```yaml
- name: Rami Code Review
  id: review
  uses: rami-code-review/actions@v1

- name: Check Review Results
  run: |
    echo "Status: ${{ steps.review.outputs.status }}"
    echo "Total Issues: ${{ steps.review.outputs.total_issues }}"
    echo "Blocking: ${{ steps.review.outputs.blocking_count }}"
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `fail_on` | Severity level that causes failure: `blocking`, `high`, `medium`, `low`, `none` | No | `blocking` |

## Outputs

| Output | Description |
|--------|-------------|
| `status` | Review status: `clean`, `issues_found`, or `blocked` |
| `total_issues` | Total number of issues found |
| `blocking_count` | Number of blocking issues |
| `high_count` | Number of high severity issues |
| `medium_count` | Number of medium severity issues |
| `low_count` | Number of low severity issues |
| `files_reviewed` | Number of files reviewed |
| `review_url` | URL to the reviewed PR |

## Repository Configuration

Create a `.rami.yml` file in your repository root to customize review behavior:

```yaml
# .rami.yml
fail_on: high          # Override default fail_on threshold
ignore_paths:
  - "vendor/**"
  - "**/*.generated.go"
```

## Troubleshooting

### "OIDC authentication required"

Ensure your workflow has the `id-token: write` permission:

```yaml
permissions:
  id-token: write
```

### "Failed to authenticate with GitHub"

The Rami GitHub App must be installed on your repository. Visit the [Rami GitHub App](https://github.com/apps/rami-code-remeow) to install it.

### "Review not found"

The review may not have been triggered yet. Ensure the Rami GitHub App is installed and the webhook is configured correctly. The action will wait for the review to complete.

## License

MIT License - see [LICENSE](LICENSE) for details.
