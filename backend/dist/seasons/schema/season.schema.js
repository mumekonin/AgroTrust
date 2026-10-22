var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
export const SeasonStatus = {
    DRAFT: 'draft',
    OPEN: 'open',
    CLOSED: 'closed',
};
export const SEASON_STATUSES = Object.values(SeasonStatus);
export const PriorityPolicy = {
    FCFS: 'FCFS',
    SMALLEST_LAND_FIRST: 'SMALLEST_LAND_FIRST',
};
export const PRIORITY_POLICIES = Object.values(PriorityPolicy);
export function seasonWindowError(window) {
    const start = window.startsAt.getTime();
    const end = window.endsAt.getTime();
    const open = window.requestsOpenAt.getTime();
    const close = window.requestsCloseAt.getTime();
    const cutoff = window.requisitionCutoffAt.getTime();
    if (!(start < end))
        return 'The season must end after it starts';
    if (!(start <= open && open < close && close <= end)) {
        return 'The request window must sit inside the season';
    }
    if (!(close <= cutoff && cutoff <= end)) {
        return 'The requisition cutoff must sit after requests close and inside the season';
    }
    return null;
}
let Season = class Season {
    code;
    name;
    startsAt;
    endsAt;
    requestsOpenAt;
    requestsCloseAt;
    requisitionCutoffAt;
    paymentWindowDays;
    pickupWindowDays;
    priorityPolicy;
    status;
};
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], Season.prototype, "code", void 0);
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], Season.prototype, "name", void 0);
__decorate([
    Prop({ type: Date, required: true }),
    __metadata("design:type", Date)
], Season.prototype, "startsAt", void 0);
__decorate([
    Prop({ type: Date, required: true }),
    __metadata("design:type", Date)
], Season.prototype, "endsAt", void 0);
__decorate([
    Prop({ type: Date, required: true }),
    __metadata("design:type", Date)
], Season.prototype, "requestsOpenAt", void 0);
__decorate([
    Prop({ type: Date, required: true }),
    __metadata("design:type", Date)
], Season.prototype, "requestsCloseAt", void 0);
__decorate([
    Prop({ type: Date, required: true }),
    __metadata("design:type", Date)
], Season.prototype, "requisitionCutoffAt", void 0);
__decorate([
    Prop({ type: Number, required: true, min: 1 }),
    __metadata("design:type", Number)
], Season.prototype, "paymentWindowDays", void 0);
__decorate([
    Prop({ type: Number, required: true, min: 1 }),
    __metadata("design:type", Number)
], Season.prototype, "pickupWindowDays", void 0);
__decorate([
    Prop({ type: String, enum: PRIORITY_POLICIES, default: PriorityPolicy.FCFS }),
    __metadata("design:type", String)
], Season.prototype, "priorityPolicy", void 0);
__decorate([
    Prop({ type: String, enum: SEASON_STATUSES, default: SeasonStatus.DRAFT }),
    __metadata("design:type", String)
], Season.prototype, "status", void 0);
Season = __decorate([
    Schema({ collection: 'seasons', timestamps: true })
], Season);
export { Season };
export const SeasonSchema = SchemaFactory.createForClass(Season);
SeasonSchema.index({ code: 1 }, { unique: true });
//# sourceMappingURL=season.schema.js.map