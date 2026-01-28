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
export declare class RamiApiError extends Error {
    readonly statusCode: number;
    readonly shouldSkip: boolean;
    constructor(message: string, statusCode: number, shouldSkip: boolean);
}
export declare class RamiClient {
    private baseUrl;
    private token;
    constructor(baseUrl: string, token: string);
    status(request: StatusRequest): Promise<StatusResponse>;
    registerCallback(request: CallbackRequest): Promise<CallbackResponse>;
}
