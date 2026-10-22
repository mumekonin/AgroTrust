export function toAccessSessionResponse(issued) {
    return {
        accessToken: issued.accessToken,
        expiresIn: issued.expiresIn,
        tokenType: 'Bearer',
        refreshToken: issued.refreshToken,
        csrfToken: issued.csrfToken,
    };
}
//# sourceMappingURL=auth.response.js.map