import * as core from '@actions/core';
import * as github from '@actions/github';
import { RamiClient, ReviewResponse } from './api';

async function run(): Promise<void> {
  try {
    // Get inputs
    const apiUrl = core.getInput('api_url') || 'https://rami.review';
    const failOn = core.getInput('fail_on') || 'blocking';
    const postComments = core.getInput('post_comments') !== 'false';

    // Resolve PR context
    const { prUrl, prNumber, repository } = resolvePRContext();

    core.info(`Reviewing PR: ${prUrl}`);
    core.info(`Fail on: ${failOn}`);
    core.info(`Post comments: ${postComments}`);

    // Get OIDC token for authentication
    // Audience must match server's RamiAudience constant
    const oidcToken = await core.getIDToken('https://rami.review');

    // Create API client and run review
    const client = new RamiClient(apiUrl, oidcToken);
    const response = await client.review({
      pr_url: prUrl,
      pr_number: prNumber,
      repository,
      fail_on: failOn,
      post_comments: postComments,
    });

    // Set outputs
    setOutputs(response);

    // Log summary
    core.info(`Review completed: ${response.summary}`);

    // Output annotations for GitHub Actions UI
    outputAnnotations(response);

    // Determine if we should fail
    if (response.status === 'blocked') {
      core.setFailed(`Review blocked: ${response.outputs.blocking_count} blocking issue(s) found`);
    } else if (response.status === 'error') {
      core.setFailed(`Review failed: ${response.error}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unexpected error occurred');
    }
  }
}

function resolvePRContext(): { prUrl: string; prNumber: number; repository: string } {
  // Check for explicit inputs first
  let prUrl = core.getInput('pr_url');
  let prNumber = parseInt(core.getInput('pr_number'), 10) || 0;

  const context = github.context;
  const repository = `${context.repo.owner}/${context.repo.repo}`;

  // If PR URL provided, use it
  if (prUrl) {
    // Extract PR number from URL if not provided
    if (!prNumber) {
      const match = prUrl.match(/\/pull\/(\d+)/);
      if (match) {
        prNumber = parseInt(match[1], 10);
      }
    }
    return { prUrl, prNumber, repository };
  }

  // Try to get PR number from context
  if (!prNumber) {
    if (context.payload.pull_request) {
      prNumber = context.payload.pull_request.number;
    } else if (context.payload.issue?.pull_request) {
      prNumber = context.payload.issue.number;
    } else if (context.eventName === 'push') {
      // For push events, we can't determine PR number automatically
      throw new Error(
        'Cannot determine PR number from push event. Please provide pr_url or pr_number input, ' +
          'or use this action on pull_request events.'
      );
    }
  }

  if (!prNumber) {
    throw new Error(
      'Could not determine PR number. Please provide pr_url or pr_number input, ' +
        'or ensure this action runs on a pull_request event.'
    );
  }

  prUrl = `https://github.com/${repository}/pull/${prNumber}`;
  return { prUrl, prNumber, repository };
}

function setOutputs(response: ReviewResponse): void {
  core.setOutput('status', response.outputs.status);
  core.setOutput('total_issues', response.outputs.total_issues);
  core.setOutput('blocking_count', response.outputs.blocking_count);
  core.setOutput('high_count', response.outputs.high_count);
  core.setOutput('medium_count', response.outputs.medium_count);
  core.setOutput('low_count', response.outputs.low_count);
  core.setOutput('files_reviewed', response.outputs.files_reviewed);
  core.setOutput('review_url', response.outputs.review_url);
}

function outputAnnotations(response: ReviewResponse): void {
  if (!response.issues || response.issues.length === 0) {
    return;
  }

  for (const issue of response.issues) {
    const severity = issue.severity?.toLowerCase() || 'warning';
    const properties: core.AnnotationProperties = {
      file: issue.file_path,
      startLine: issue.line_number,
      title: `[${issue.severity}] ${issue.category}`,
    };

    const message = `${issue.description}\n\nRisk: ${issue.risk}\nFix: ${issue.fix}`;

    if (severity === 'blocking' || severity === 'critical') {
      core.error(message, properties);
    } else {
      core.warning(message, properties);
    }
  }
}

run();
