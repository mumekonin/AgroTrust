export function toInputResponse(input) {
    return {
        id: input.id ?? String(input._id),
        code: input.code,
        name: { en: input.name.en, am: input.name.am, om: input.name.om },
        category: input.category,
        baseUnit: 'kg',
        packSizeKg: input.packSizeKg,
        active: input.active,
    };
}
export function toPriceResponse(price) {
    return {
        id: price.id ?? String(price._id),
        inputId: String(price.inputId),
        seasonId: String(price.seasonId),
        regionId: price.regionId ? String(price.regionId) : undefined,
        unitPriceSantimPerKg: price.unitPriceSantimPerKg,
        subsidySantimPerKg: price.subsidySantimPerKg,
        effectiveFrom: price.effectiveFrom,
        effectiveTo: price.effectiveTo ?? undefined,
        setBy: String(price.setBy),
        approvedBy: price.approvedBy ? String(price.approvedBy) : undefined,
        reason: price.reason,
    };
}
//# sourceMappingURL=catalog.response.js.map