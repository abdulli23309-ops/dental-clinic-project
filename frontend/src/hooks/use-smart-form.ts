"use client";

import { useState, useCallback, useTransition } from "react";
import { toast } from "sonner";

export type ValidationRules<T> = {
  [K in keyof T]?: (value: T[K], allValues: T) => string | null | undefined;
};

export interface UseSmartFormOptions<T> {
  initialValues: T;
  validate?: ValidationRules<T>;
  onSubmit: (values: T) => Promise<unknown>;
  onSuccess?: (result: unknown) => void;
  successMessage?: string;
}

/**
 * Smart form hook combining client-side smart gating (on-blur and post-submit on-change)
 * with automatic parsing and mapping of backend Pydantic 422 field errors.
 */
export function useSmartForm<T extends Record<string, unknown>>({
  initialValues,
  validate,
  onSubmit,
  onSuccess,
  successMessage,
}: UseSmartFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  const validateField = useCallback(
    (field: keyof T, val: T[keyof T], all: T) => {
      if (!validate || !validate[field]) return null;
      return validate[field]!(val, all);
    },
    [validate]
  );

  const validateAll = useCallback(
    (currentValues: T) => {
      const newErrors: Partial<Record<keyof T, string>> = {};
      if (validate) {
        for (const key of Object.keys(validate) as Array<keyof T>) {
          const err = validate[key]?.(currentValues[key], currentValues);
          if (err) {
            newErrors[key] = err;
          }
        }
      }
      return newErrors;
    },
    [validate]
  );

  const setValue = useCallback(
    (field: keyof T, val: T[keyof T]) => {
      setValues((prev) => {
        const next = { ...prev, [field]: val };
        // Only re-validate on change IF user has already attempted submit or field was blurred
        if (hasSubmitted || touched[field]) {
          const err = validateField(field, val, next);
          setErrors((e) => ({ ...e, [field]: err || undefined }));
        }
        return next;
      });
    },
    [hasSubmitted, touched, validateField]
  );

  const handleBlur = useCallback(
    (field: keyof T) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const err = validateField(field, values[field], values);
      setErrors((prev) => ({ ...prev, [field]: err || undefined }));
    },
    [validateField, values]
  );

  const parseBackendErrors = useCallback((errorData: unknown) => {
    // Check if error is FastAPI 422 validation response: { detail: [{ loc: ['body', 'field'], msg: '...' }] }
    if (
      typeof errorData === "object" &&
      errorData !== null &&
      "detail" in errorData &&
      Array.isArray((errorData as { detail: unknown[] }).detail)
    ) {
      const fieldErrors: Partial<Record<keyof T, string>> = {};
      for (const item of (errorData as { detail: Array<{ loc?: string[]; msg?: string }> }).detail) {
        if (item.loc && Array.isArray(item.loc)) {
          const fieldName = item.loc[item.loc.length - 1] as keyof T;
          if (fieldName && item.msg) {
            fieldErrors[fieldName] = item.msg;
          }
        }
      }
      return fieldErrors;
    }
    return null;
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      setHasSubmitted(true);

      const clientErrors = validateAll(values);
      if (Object.keys(clientErrors).length > 0) {
        setErrors(clientErrors);
        toast.error("Please correct the errors in the form before submitting.");
        return;
      }

      setIsSubmitting(true);
      try {
        const result = await onSubmit(values);
        setIsSubmitting(false);
        if (successMessage) {
          toast.success(successMessage);
        }
        onSuccess?.(result);
      } catch (err: unknown) {
        setIsSubmitting(false);
        // Attempt to parse structured backend field errors
        let mapped = false;
        if (typeof err === "object" && err !== null && "response" in err) {
          const res = (err as { response?: unknown }).response;
          const backendFieldErrors = parseBackendErrors(res);
          if (backendFieldErrors && Object.keys(backendFieldErrors).length > 0) {
            setErrors((prev) => ({ ...prev, ...backendFieldErrors }));
            mapped = true;
          }
        }

        const msg = err instanceof Error ? err.message : "Submission failed";
        toast.error(mapped ? "Please check highlighted fields" : msg);
      }
    },
    [values, validateAll, onSubmit, onSuccess, successMessage, parseBackendErrors]
  );

  const reset = useCallback(
    (newValues?: T) => {
      setValues(newValues || initialValues);
      setErrors({});
      setTouched({});
      setHasSubmitted(false);
      setIsSubmitting(false);
    },
    [initialValues]
  );

  return {
    values,
    errors,
    touched,
    isSubmitting,
    hasSubmitted,
    setValue,
    handleBlur,
    handleSubmit,
    reset,
    setValues,
    setErrors,
  };
}

