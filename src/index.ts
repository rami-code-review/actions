import * as core from '@actions/core';
import * as github from '@actions/github';
import { RamiClient, RamiApiError, StatusResponse } from './api';

const API_URL = 'https://rami.reviews';
const MAX_POLL_TIME_MS = 5 * 60 * 1000; // 5 minutes
const POLL_INTERVAL_MS = 15 * 1000; // 15 seconds

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run(): Promise<void> {
  try {
    const failOn = core.getInput('fail_on') || 'low';

    // Get PR number from GitHub context
    const prNumber = github.context.payload.pull_request?.number;
    if (!prNumber) {
      throw new Error(
        'Could not determine PR number. This action must run on pull_request events.'
      );
    }

    core.info(`Checking review status for PR #${prNumber}...`);
    core.info(`Fail on: ${failOn}`);

    const oidcToken = await core.getIDToken('https://rami.reviews');
    const client = new RamiClient(API_URL, oidcToken);

    // Poll for review completion
    const startTime = Date.now();
    let response: StatusResponse;
    let pollCount = 0;

    do {
      pollCount++;
      response = await client.status({ pr_number: prNumber, fail_on: failOn });

      // Check if review is complete (not in_progress or not_found)
      if (response.status !== 'in_progress' && response.status !== 'not_found') {
        break;
      }

      // Check if we've exceeded max poll time
      const elapsed = Date.now() - startTime;
      if (elapsed >= MAX_POLL_TIME_MS) {
        core.warning(`Review did not complete within ${MAX_POLL_TIME_MS / 1000} seconds`);
        break;
      }

      // Log progress and wait before next poll
      const remainingSeconds = Math.round((MAX_POLL_TIME_MS - elapsed) / 1000);
      core.info(
        `Review ${response.status === 'not_found' ? 'not started yet' : 'in progress'}. ` +
          `Waiting ${POLL_INTERVAL_MS / 1000}s before retry (${remainingSeconds}s remaining)...`
      );
      await sleep(POLL_INTERVAL_MS);
      // eslint-disable-next-line no-constant-condition
    } while (true);

    core.info(`Poll completed after ${pollCount} attempt(s)`);

    setOutputs(response);

    core.info(`Review completed: ${response.summary}`);

    outputAnnotations(response);

    // Handle final status
    if (response.status === 'blocked') {
      // Register callback for automatic re-trigger when review becomes clean
      try {
        const callbackResponse = await client.registerCallback({ pr_number: prNumber });
        if (callbackResponse.registered) {
          core.info('Registered for automatic re-trigger when review becomes clean');
        }
      } catch (callbackError) {
        // Log but don't fail - callback registration is best-effort
        core.warning(`Failed to register callback: ${callbackError}`);
      }
      core.setFailed(`Review blocked: ${response.outputs.blocking_count} blocking issue(s) found`);
    } else if (response.status === 'error') {
      core.setFailed(`Review failed: ${response.error}`);
    } else if (response.status === 'in_progress' || response.status === 'not_found') {
      // Timed out waiting for review
      core.setFailed(
        `Review did not complete within ${MAX_POLL_TIME_MS / 1000} seconds. ` +
          `Status: ${response.status}. Please check if the Rami GitHub App is installed and webhooks are configured.`
      );
    }
  } catch (error) {
    if (error instanceof RamiApiError && error.shouldSkip) {
      core.warning(`Skipping Rami review: ${error.message}`);
      core.info(
        'This may be due to plan limitations or quota. Visit https://rami.reviews/pricing for details.'
      );
      return;
    }
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unexpected error occurred');
    }
  }
}

function setOutputs(response: StatusResponse): void {
  core.setOutput('status', response.outputs.status);
  core.setOutput('total_issues', response.outputs.total_issues);
  core.setOutput('blocking_count', response.outputs.blocking_count);
  core.setOutput('high_count', response.outputs.high_count);
  core.setOutput('medium_count', response.outputs.medium_count);
  core.setOutput('low_count', response.outputs.low_count);
  core.setOutput('files_reviewed', response.outputs.files_reviewed);
  core.setOutput('review_url', response.outputs.review_url);
}

function outputAnnotations(response: StatusResponse): void {
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
