import { z } from "zod";
import {
  CREDIT_REQUEST_MAX_AMOUNT,
  CREDIT_REQUEST_NOTE_MAX_LENGTH,
} from "../constants/credit-request";
import { optionalTextSchema } from "./common";

// POST /api/relations/:id/credit-requests（学生申请增加课时）的请求体
export const createCreditRequestSchema = z.object({
  amount: z.number().int().min(1).max(CREDIT_REQUEST_MAX_AMOUNT),
  note: optionalTextSchema(CREDIT_REQUEST_NOTE_MAX_LENGTH),
});

// POST /api/credit-requests/:id/reject（老师拒绝）的请求体
export const rejectCreditRequestSchema = z.object({
  reason: optionalTextSchema(CREDIT_REQUEST_NOTE_MAX_LENGTH),
});

export type CreateCreditRequestInput = z.input<typeof createCreditRequestSchema>;
export type CreateCreditRequestValues = z.output<typeof createCreditRequestSchema>;
