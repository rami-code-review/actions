export interface ReviewRequest {
  pr_url?: string;
  pr_number?: number;
  repository?: string;
  fail_on?: string;
  post_comments?: boolean;
}

export interface ReviewIssue {
  file_path: string;
  line_number: number;
  severity: string;
  category: string;
  description: string;
  problem: string;
  risk: string;
  fix: string;
  suggested_code?: string;
}

export interface ReviewOutputs {
  status: string;
  blocking_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  total_issues: number;
  files_reviewed: number;
  review_url: string;
}

export interface ReviewResponse {
  status: string;
  pr_url: string;
  summary: string;
  outputs: ReviewOutputs;
  issues?: ReviewIssue[];
  annotations?: string[];
  error?: string;
}

export class RamiClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  async review(request: ReviewRequest): Promise<ReviewResponse> {
    const url = `${this.baseUrl}/api/v1/actions/review`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Rami API request failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as ReviewResponse;

    // API returns 200 even for errors, check status field
    if (data.status === 'error' && data.error) {
      throw new Error(`Rami review failed: ${data.error}`);
    }

    return data;
  }
}
