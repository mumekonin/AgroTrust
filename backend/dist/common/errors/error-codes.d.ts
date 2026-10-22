export declare const ErrorCode: {
    readonly VALIDATION_FAILED: "VALIDATION_FAILED";
    readonly UNAUTHENTICATED: "UNAUTHENTICATED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly STEP_UP_REQUIRED: "STEP_UP_REQUIRED";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly CONFLICT: "CONFLICT";
    readonly DUPLICATE_RESOURCE: "DUPLICATE_RESOURCE";
    readonly TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS";
    readonly QUOTA_EXCEEDED: "QUOTA_EXCEEDED";
    readonly SEASON_CLOSED: "SEASON_CLOSED";
    readonly INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK";
    readonly PICKUP_CODE_INVALID: "PICKUP_CODE_INVALID";
    readonly HTTP_ERROR: "HTTP_ERROR";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
};
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
