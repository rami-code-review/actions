import { RamiClient, ReviewResponse } from './api';

describe('RamiClient', () => {
  const mockToken = 'mock-oidc-token';
  const baseUrl = 'https://rami.review';

  describe('constructor', () => {
    it('should strip trailing slash from base URL', () => {
      const client = new RamiClient('https://rami.review/', mockToken);
      // Access private field for testing (we'd normally test via behavior)
      expect((client as unknown as { baseUrl: string }).baseUrl).toBe('https://rami.review');
    });
  });

  describe('review', () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should make POST request with correct headers', async () => {
      const mockResponse: ReviewResponse = {
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
      const result = await client.review({ pr_url: 'https://github.com/owner/repo/pull/1' });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://rami.review/api/v1/actions/review',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          },
        })
      );
      expect(result.status).toBe('clean');
    });

    it('should throw on HTTP error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      } as Response);

      const client = new RamiClient(baseUrl, mockToken);

      await expect(client.review({ pr_url: 'https://github.com/owner/repo/pull/1' })).rejects.toThrow(
        'Rami API request failed (500): Internal Server Error'
      );
    });

    it('should throw on error status in response', async () => {
      const mockResponse: ReviewResponse = {
        status: 'error',
        pr_url: '',
        summary: 'Review failed',
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

      await expect(client.review({ pr_url: 'https://github.com/owner/repo/pull/1' })).rejects.toThrow(
        'Rami review failed: Authentication failed'
      );
    });
  });
});
