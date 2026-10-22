export function toUserResponse(user) {
    return {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        roles: user.roles,
        status: user.status,
        preferredLanguage: user.preferredLanguage,
        scope: {
            regionIds: user.scope.regionIds.map(String),
            woredaIds: user.scope.woredaIds.map(String),
            localCenterIds: user.scope.localCenterIds.map(String),
            distributorId: user.scope.distributorId?.toString(),
        },
        mfa: { totpEnabled: user.mfa.totpEnabled },
        lastLoginAt: user.lastLoginAt,
    };
}
//# sourceMappingURL=user.response.js.map