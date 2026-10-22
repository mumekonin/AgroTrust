export function toGeoResponse(unit) {
    return {
        id: unit.id ?? String(unit._id),
        type: unit.type,
        code: unit.code,
        name: { en: unit.name.en, am: unit.name.am, om: unit.name.om },
        parentId: unit.parentId ? String(unit.parentId) : undefined,
        path: (unit.path ?? []).map(String),
    };
}
//# sourceMappingURL=geo.response.js.map