export function toSeasonResponse(season) {
    return {
        id: season.id ?? String(season._id),
        code: season.code,
        name: season.name,
        startsAt: season.startsAt,
        endsAt: season.endsAt,
        requestsOpenAt: season.requestsOpenAt,
        requestsCloseAt: season.requestsCloseAt,
        requisitionCutoffAt: season.requisitionCutoffAt,
        paymentWindowDays: season.paymentWindowDays,
        pickupWindowDays: season.pickupWindowDays,
        priorityPolicy: season.priorityPolicy,
        status: season.status,
    };
}
//# sourceMappingURL=seasons.response.js.map