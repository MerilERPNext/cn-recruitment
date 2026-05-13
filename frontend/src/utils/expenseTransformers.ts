/* eslint-disable @typescript-eslint/no-explicit-any */
import { format, isValid, parseISO } from "date-fns";
import { DEFAULT_CATEGORY_TYPE } from "../constants/expense.constants";
import { ExistingAttachment, ParticipantLike } from "../types/expense.types";
import { dedupeAttachments, normalizeExistingAttachment } from "./attachment.utils";

// Make sure to import ExpenseNavigationExpense if needed or use 'any' if not defined in types yet.
// For now, using 'any' to avoid circular dependency before we extract it, or we can use it from the helper.
import { ExpenseNavigationExpense } from "../components/Expenses-App/ExpenseClaim/expenseNavigationHelper";

export const normalizeDateOnly = (value: unknown) => {
  if (!value) return value;

  if (value instanceof Date) {
    return format(value, "yyyy-MM-dd");
  }

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(value)) {
      const [year, month, day] = value.split("-").map(Number);
      return [
        String(year),
        String(month).padStart(2, "0"),
        String(day).padStart(2, "0"),
      ].join("-");
    }

    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(value)) {
      const [day, month, year] = value.split("-").map(Number);
      return [
        String(year),
        String(month).padStart(2, "0"),
        String(day).padStart(2, "0"),
      ].join("-");
    }

    const isoCandidate = value.includes(" ") ? value.replace(" ", "T") : value;
    const parsedFromIso = parseISO(isoCandidate);
    if (isValid(parsedFromIso)) {
      return format(parsedFromIso, "yyyy-MM-dd");
    }

    const parsedFromDate = new Date(value);
    if (!Number.isNaN(parsedFromDate.getTime())) {
      return format(parsedFromDate, "yyyy-MM-dd");
    }
  }

  return value;
};

export const normalizeExpensePayloadData = (data: Record<string, any>) => {
  const normalizedData = { ...data };

  // Normalize any custom or dynamic keys that got populated in dd-MM-yyyy format
  Object.keys(normalizedData).forEach((key) => {
    const value = normalizedData[key];
    if (typeof value === "string" && /^\d{1,2}-\d{1,2}-\d{4}$/.test(value)) {
      normalizedData[key] = normalizeDateOnly(value);
    }
  });

  if (normalizedData.expense_date) {
    normalizedData.expense_date = normalizeDateOnly(
      normalizedData.expense_date,
    );
  }

  if (normalizedData.start_datetime) {
    normalizedData.start_datetime = format(
      new Date(normalizedData.start_datetime),
      "yyyy-MM-dd HH:mm:ss",
    );
  }

  if (normalizedData.end_datetime) {
    normalizedData.end_datetime = format(
      new Date(normalizedData.end_datetime),
      "yyyy-MM-dd HH:mm:ss",
    );
  }

  return normalizedData;
};

export const parseCustomFormData = (value: unknown): Record<string, unknown> => {
  if (!value) return {};

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
};

export const normalizeParticipantAmount = (
  participant: ParticipantLike,
): ParticipantLike => {
  if (participant.amount !== undefined && participant.amount !== null) {
    return participant;
  }

  if (
    participant.allocated_amount === undefined ||
    participant.allocated_amount === null
  ) {
    return participant;
  }

  return {
    ...participant,
    amount:
      typeof participant.allocated_amount === "number"
        ? participant.allocated_amount
        : Number(participant.allocated_amount),
  };
};

export const buildInitialDynamicFormData = (
  expense?: ExpenseNavigationExpense | null,
): Record<string, any> => {
  if (!expense) return {};

  const customFormData = parseCustomFormData(expense.custom_form_data);
  const nextData: Record<string, any> = {
    ...customFormData,
    ...expense,
  };

  delete nextData.custom_form_data;

  const categoryType =
    typeof nextData.category_type === "string" && nextData.category_type
      ? nextData.category_type
      : typeof nextData.categoryType === "string" && nextData.categoryType
        ? nextData.categoryType
        : DEFAULT_CATEGORY_TYPE;

  nextData.category_type = categoryType;
  nextData.categoryType = categoryType;

  const rawAttachments = Array.isArray(nextData.attach_receipt)
    ? nextData.attach_receipt
    : nextData.attach_receipt
      ? [nextData.attach_receipt]
      : Array.isArray(nextData.attachments)
        ? nextData.attachments
        : nextData.attachments
          ? [nextData.attachments]
          : nextData.custom_attach_receipt
            ? [nextData.custom_attach_receipt]
            : [];

  const normalizedAttachments = rawAttachments
    .map(normalizeExistingAttachment)
    .filter((item): item is ExistingAttachment => item !== null);

  if (normalizedAttachments.length > 0) {
    nextData.attach_receipt = dedupeAttachments(normalizedAttachments);
  }

  if (
    Array.isArray(nextData.participants) &&
    nextData.participants.length > 0
  ) {
    nextData.participants = nextData.participants.map((participant: unknown) =>
      participant && typeof participant === "object"
        ? normalizeParticipantAmount(participant as ParticipantLike)
        : participant,
    );
    nextData.shareExpenseCheckbox = true;
  }

  return normalizeExpensePayloadData(nextData);
};
