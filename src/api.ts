export interface StatusRequest {
  pr_number: number;
  fail_on?: string;
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

export interface StatusResponse {
  status: string;
  pr_url: string;
  summary: string;
  outputs: ReviewOutputs;
  issues?: ReviewIssue[];
  annotations?: string[];
  error?: string;
}

export interface CallbackRequest {
  pr_number: number;
}

export interface CallbackResponse {
  registered: boolean;
  expires_at?: string;
  message?: string;
}

export class RamiApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly shouldSkip: boolean
  ) {
    super(message);
    this.name = 'RamiApiError';
  }
}

const SKIP_STATUS_CODES = [402, 403, 429, 500, 502, 503, 504];

export class RamiClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  async status(request: StatusRequest): Promise<StatusResponse> {
    const params = new URLSearchParams();
    params.set('pr_number', request.pr_number.toString());
    if (request.fail_on) {
      params.set('fail_on', request.fail_on);
    }

    const queryString = params.toString();
    const url = `${this.baseUrl}/api/v1/actions/status${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      const shouldSkip = SKIP_STATUS_CODES.includes(response.status);
      throw new RamiApiError(
        `Rami API request failed (${response.status}): ${text}`,
        response.status,
        shouldSkip
      );
    }

    const data = (await response.json()) as StatusResponse;

    if (data.status === 'error' && data.error) {
      throw new Error(`Rami status check failed: ${data.error}`);
    }

    return data;
  }

  async registerCallback(request: CallbackRequest): Promise<CallbackResponse> {
    const url = `${this.baseUrl}/api/v1/actions/callback`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Rami callback registration failed (${response.status}): ${text}`);
    }

    return (await response.json()) as CallbackResponse;
  }
}
