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
export declare class RamiClient {
    private baseUrl;
    private token;
    constructor(baseUrl: string, token: string);
    review(request: ReviewRequest): Promise<ReviewResponse>;
}
