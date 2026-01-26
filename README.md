# Rami Code Review Action

Wait for AI-powered code review results on your pull requests. This GitHub Action integrates [Rami](https://rami.reviews) into your CI/CD pipeline to report on code review findings.

## How It Works

1. **Webhook-triggered reviews**: When you push to a PR, the [Rami GitHub App](https://github.com/apps/rami-code-remeow) automatically triggers a review via webhooks
2. **This action waits**: The action calls the [Rami API](https://rami.reviews) and waits for the review to complete (up to 5 minutes)
3. **CI integration**: Results appear as GitHub annotations on the PR files and as action outputs
4. **Auto-retry**: If the review is blocked, the action registers for automatic workflow re-trigger when the review becomes clean

> **Note**: This action does NOT trigger reviews—it only waits for and reports on webhook-initiated reviews.

## Prerequisites

1. **Rami GitHub App**: Install the [Rami GitHub App](https://github.com/apps/rami-code-remeow) on your repository
2. **Plan Requirements**: Your organization must have a **Team+ plan**, or for personal accounts, a **Pro+ plan**. See [pricing](https://rami.reviews/pricing) for details.

## Usage

### Basic Usage

```yaml
name: Rami Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  id-token: write  # Required for OIDC authentication

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Rami Code Review
        uses: rami-actions/rami-actions@v1
```

### With Custom Failure Threshold

```yaml
- name: Rami Code Review
  uses: rami-actions/rami-actions@v1
  with:
    # Fail the action if issues at this severity or above are found
    # Options: blocking, high, medium, low, none
    fail_on: high
```

### Using Outputs

```yaml
- name: Rami Code Review
  id: review
  uses: rami-actions/rami-actions@v1

- name: Check Review Results
  if: always()
  run: |
    echo "Status: ${{ steps.review.outputs.status }}"
    echo "Total Issues: ${{ steps.review.outputs.total_issues }}"
    echo "Blocking: ${{ steps.review.outputs.blocking_count }}"
    echo "Files Reviewed: ${{ steps.review.outputs.files_reviewed }}"
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `fail_on` | Severity level that causes failure: `blocking`, `high`, `medium`, `low`, `none` | No | `low` |

## Outputs

| Output | Description |
|--------|-------------|
| `status` | Review status (see table below) |
| `total_issues` | Total number of issues found |
| `blocking_count` | Number of blocking/critical issues |
| `high_count` | Number of high severity issues |
| `medium_count` | Number of medium severity issues |
| `low_count` | Number of low severity issues |
| `files_reviewed` | Number of files reviewed |
| `review_url` | URL to the reviewed PR |

### Status Values

| Status | Description |
|--------|-------------|
| `clean` | Review completed with no issues |
| `issues_found` | Issues found but below the `fail_on` threshold |
| `blocked` | Issues found at or above the `fail_on` threshold (action fails) |
| `not_found` | No review found—webhook may not have triggered yet |
| `in_progress` | Review is still running (timed out waiting) |
| `error` | Review failed due to an error |

## Troubleshooting

### "OIDC authentication required"

Ensure your workflow has the `id-token: write` permission:

```yaml
permissions:
  id-token: write
```

### "Not authorized for GitHub Actions integration"

Your organization or personal account needs the appropriate plan:
- **Organizations**: Team plan or higher
- **Personal accounts**: Pro+ plan

Visit [rami.reviews/pricing](https://rami.reviews/pricing) for plan details.

### "Review did not complete within 300 seconds"

The action polls for up to 5 minutes waiting for the review to complete. If it times out:

1. **Check the Rami GitHub App is installed**: Visit [github.com/apps/rami-code-remeow](https://github.com/apps/rami-code-remeow) to install it on your repository
2. **Large PRs take longer**: Reviews with many files may exceed 5 minutes. Consider splitting into smaller PRs

> **Note**: Rami automatically skips vendor directories, generated code, lock files, binaries, and documentation files—these don't slow down reviews.

## Links

- **Website**: [rami.reviews](https://rami.reviews)
- **Pricing**: [rami.reviews/pricing](https://rami.reviews/pricing)
- **GitHub App**: [github.com/apps/rami-code-remeow](https://github.com/apps/rami-code-remeow)

## License

MIT License—see [LICENSE](LICENSE) for details.
