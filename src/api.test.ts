import { RamiClient, RamiApiError, StatusResponse, CallbackResponse } from './api';

describe('RamiClient', () => {
  const mockToken = 'mock-oidc-token';
  const baseUrl = 'https://rami.reviews';

  describe('constructor', () => {
    it('should strip trailing slash from base URL', () => {
      const client = new RamiClient('https://rami.reviews/', mockToken);
      expect((client as unknown as { baseUrl: string }).baseUrl).toBe('https://rami.reviews');
    });
  });

  describe('status', () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should make GET request with correct headers', async () => {
      const mockResponse: StatusResponse = {
        status: 'clean',
        pr_url: 'https://github.com/owner/repo/pull/1',
        summary: 'Reviewed 5 files. No issues found.',
        outputs: {
          status: 'clean',
          blocking_count: 0,
          high_count: 0,
          medium_count: 0,
          low_count: 0,
          total_issues: 0,
          files_reviewed: 5,
          review_url: 'https://github.com/owner/repo/pull/1',
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const client = new RamiClient(baseUrl, mockToken);
      const result = await client.status({ pr_number: 123 });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://rami.reviews/api/v1/actions/status?pr_number=123',
        expect.objectContaining({
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
        })
      );
      expect(result.status).toBe('clean');
    });

    it('should include fail_on query parameter when provided', async () => {
      const mockResponse: StatusResponse = {
        status: 'clean',
        pr_url: 'https://github.com/owner/repo/pull/1',
        summary: 'Reviewed 5 files. No issues found.',
        outputs: {
          status: 'clean',
          blocking_count: 0,
          high_count: 0,
          medium_count: 0,
          low_count: 0,
          total_issues: 0,
          files_reviewed: 5,
          review_url: 'https://github.com/owner/repo/pull/1',
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const client = new RamiClient(baseUrl, mockToken);
      await client.status({ pr_number: 456, fail_on: 'high' });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://rami.reviews/api/v1/actions/status?pr_number=456&fail_on=high',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should throw on HTTP error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      } as Response);

      const client = new RamiClient(baseUrl, mockToken);

      await expect(client.status({ pr_number: 789 })).rejects.toThrow('Rami API request failed (500): Internal Server Error');
    });

    it.each([402, 403, 429])('should throw RamiApiError with shouldSkip=true for status %d', async (statusCode) => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: statusCode,
        text: () => Promise.resolve('Plan or quota error'),
      } as Response);

      const client = new RamiClient(baseUrl, mockToken);

      try {
        await client.status({ pr_number: 789 });
        fail('Expected an error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RamiApiError);
        const apiError = error as RamiApiError;
        expect(apiError.statusCode).toBe(statusCode);
        expect(apiError.shouldSkip).toBe(true);
      }
    });

    it('should throw RamiApiError with shouldSkip=false for non-skip status codes', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      } as Response);

      const client = new RamiClient(baseUrl, mockToken);

      try {
        await client.status({ pr_number: 789 });
        fail('Expected an error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RamiApiError);
        const apiError = error as RamiApiError;
        expect(apiError.statusCode).toBe(500);
        expect(apiError.shouldSkip).toBe(false);
      }
    });

    it('should throw on error status in response', async () => {
      const mockResponse: StatusResponse = {
        status: 'error',
        pr_url: '',
        summary: 'Status check failed',
        error: 'Authentication failed',
        outputs: {
          status: 'error',
          blocking_count: 0,
          high_count: 0,
          medium_count: 0,
          low_count: 0,
          total_issues: 0,
          files_reviewed: 0,
          review_url: '',
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const client = new RamiClient(baseUrl, mockToken);

      await expect(client.status({ pr_number: 101 })).rejects.toThrow('Rami status check failed: Authentication failed');
    });
  });

  describe('registerCallback', () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should make POST request with correct headers and body', async () => {
      const mockResponse: CallbackResponse = {
        registered: true,
        expires_at: '2024-01-01T00:00:00Z',
        message: 'Workflow will be re-triggered when review becomes clean',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const client = new RamiClient(baseUrl, mockToken);
      const result = await client.registerCallback({ pr_number: 123 });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://rami.reviews/api/v1/actions/callback',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pr_number: 123 }),
        })
      );
      expect(result.registered).toBe(true);
    });

    it('should throw on HTTP error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      } as Response);

      const client = new RamiClient(baseUrl, mockToken);

      await expect(client.registerCallback({ pr_number: 123 })).rejects.toThrow(
        'Rami callback registration failed (500): Internal Server Error'
      );
    });
  });
});
