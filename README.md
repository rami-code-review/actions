# Rami Code Review Action

AI-powered code review for your pull requests. This GitHub Action integrates [Rami](https://rami.review) into your CI/CD pipeline to automatically review code changes.

## Features

- Automated AI code review on every pull request
- Configurable severity thresholds for blocking merges
- Inline annotations on changed files
- OIDC-based authentication (no API keys required)

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

### With Options

```yaml
- name: Rami Code Review
  uses: rami-code-review/actions@v1
  with:
    # Fail the action if issues at this severity or above are found
    # Options: blocking, high, medium, low, none
    fail_on: 'high'

    # Whether to post review comments on the PR
    post_comments: 'true'
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

### Manual PR Specification

For workflows not triggered by `pull_request` events:

```yaml
- name: Rami Code Review
  uses: rami-code-review/actions@v1
  with:
    pr_url: 'https://github.com/owner/repo/pull/123'
    # Or use pr_number instead:
    # pr_number: 123
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `pr_url` | Pull request URL to review | No | Auto-detected |
| `pr_number` | Pull request number | No | Auto-detected |
| `fail_on` | Severity level that causes failure: `blocking`, `high`, `medium`, `low`, `none` | No | `blocking` |
| `post_comments` | Whether to post review comments | No | `true` |
| `api_url` | Rami API URL | No | `https://rami.review` |

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

## How It Works

1. **Authentication**: The action uses GitHub's OIDC tokens to authenticate with Rami. No API keys or secrets are required.

2. **Review Process**: Rami analyzes the PR diff using AI to identify potential issues including:
   - Security vulnerabilities
   - Logic errors
   - Performance problems
   - Code style issues

3. **Results**: Issues are reported as:
   - GitHub annotations (visible in the Files Changed tab)
   - PR review comments (if `post_comments` is enabled)
   - Action outputs (for use in subsequent steps)

## Troubleshooting

### "OIDC authentication required"

Ensure your workflow has the `id-token: write` permission:

```yaml
permissions:
  id-token: write
```

### "Failed to authenticate with GitHub"

The Rami GitHub App must be installed on your repository. Visit the [Rami GitHub App](https://github.com/apps/rami-code-remeow) to install it.

### "Could not determine PR number"

If running on a non-PR event (like `push`), you must provide `pr_url` or `pr_number` explicitly.

## License

MIT License - see [LICENSE](LICENSE) for details.
