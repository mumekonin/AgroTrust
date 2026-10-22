import type { Types } from 'mongoose';
import type { InputCategory } from '../../catalog/schema/input.schema.js';
import type { DistributorStatus, DistributorType } from '../schema/distributor.schema.js';

export interface DistributorResponse {
  id: string;
  code: string;
  name: string;
  type: DistributorType;
  licenceNo: string;
  contact: { phone: string; email?: string };
  serviceRegionIds: string[];
  bankAccountRef?: string;
  status: DistributorStatus;
}

export interface AssignmentResponse {
  id: string;
  seasonId: string;
  localCenterId: string;
  inputCategory: InputCategory;
  distributorId: string;
  priority: number;
  setBy: string;
  approvedBy?: string;
}

export interface DistributorListResponse {
  items: DistributorResponse[];
  nextCursor?: string;
}

export interface AssignmentListResponse {
  items: AssignmentResponse[];
  nextCursor?: string;
}

export function toDistributorResponse(distributor: {
  id?: string;
  _id?: Types.ObjectId;
  code: string;
  name: string;
  type: DistributorType;
  licenceNo: string;
  contact: { phone: string; email?: string };
  serviceRegionIds?: Array<Types.ObjectId | string>;
  bankAccountRef?: string;
  status: DistributorStatus;
}): DistributorResponse {
  return {
    id: distributor.id ?? String(distributor._id),
    code: distributor.code,
    name: distributor.name,
    type: distributor.type,
    licenceNo: distributor.licenceNo,
    contact: { phone: distributor.contact.phone, email: distributor.contact.email },
    serviceRegionIds: (distributor.serviceRegionIds ?? []).map(String),
    bankAccountRef: distributor.bankAccountRef,
    status: distributor.status,
  };
}

export function toAssignmentResponse(assignment: {
  id?: string;
  _id?: Types.ObjectId;
  seasonId: Types.ObjectId | string;
  localCenterId: Types.ObjectId | string;
  inputCategory: InputCategory;
  distributorId: Types.ObjectId | string;
  priority: number;
  setBy: Types.ObjectId | string;
  approvedBy?: Types.ObjectId | string | null;
}): AssignmentResponse {
  return {
    id: assignment.id ?? String(assignment._id),
    seasonId: String(assignment.seasonId),
    localCenterId: String(assignment.localCenterId),
    inputCategory: assignment.inputCategory,
    distributorId: String(assignment.distributorId),
    priority: assignment.priority,
    setBy: String(assignment.setBy),
    approvedBy: assignment.approvedBy ? String(assignment.approvedBy) : undefined,
  };
}
