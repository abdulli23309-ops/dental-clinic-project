import {
  PublicBookingServiceItem,
  PublicBookingClinicItem,
  PublicBookingDoctorItem,
} from "./api";

export const BOOKING_STEPS = {
  DETAILS: 0,
  SERVICE: 1,
  LOCATION: 2,
  DOCTOR: 3,
  DATETIME: 4,
  REVIEW: 5,
} as const;

export type FlowStep = 0 | 1 | 2 | 3 | 4 | 5;

export interface FlowContext {
  services: PublicBookingServiceItem[];
  clinics: PublicBookingClinicItem[];
  doctors: PublicBookingDoctorItem[];
  selectedService: string;
  selectedCity: string;
  selectedClinic: string;
  selectedDoctor: string;
  selectedDate: string;
  selectedTime: string;
  contactName: string;
  contactPhone: string;
}

export interface CityGroup {
  city: string;
  clinics: PublicBookingClinicItem[];
}

/**
 * Groups clinics by their `city` field.
 */
export function groupClinicsByCity(clinics: PublicBookingClinicItem[]): CityGroup[] {
  if (!clinics || clinics.length === 0) return [];
  const map = new Map<string, PublicBookingClinicItem[]>();
  for (const clinic of clinics) {
    const city = (clinic.city || "Other").trim();
    if (!map.has(city)) {
      map.set(city, []);
    }
    map.get(city)!.push(clinic);
  }
  return Array.from(map.entries()).map(([city, items]) => ({
    city,
    clinics: items,
  }));
}

/**
 * Returns a list of distinct city names available for the eligible clinics.
 */
export function getAvailableCities(clinics: PublicBookingClinicItem[]): string[] {
  return groupClinicsByCity(clinics).map((g) => g.city);
}

/**
 * Filters eligible clinics by city name.
 */
export function getClinicsForCity(
  clinics: PublicBookingClinicItem[],
  city: string
): PublicBookingClinicItem[] {
  if (!city) return [];
  return clinics.filter(
    (c) => (c.city || "").trim().toLowerCase() === city.trim().toLowerCase()
  );
}

/**
 * Checks if service selection can be auto-selected and skipped.
 */
export function checkServiceSkip(services: PublicBookingServiceItem[]): {
  shouldSkip: boolean;
  autoSelectedId?: string;
} {
  if (services && services.length === 1) {
    return { shouldSkip: true, autoSelectedId: services[0].id };
  }
  return { shouldSkip: false };
}

/**
 * Checks if clinic selection can be auto-selected and skipped.
 */
export function checkClinicSkip(clinics: PublicBookingClinicItem[]): {
  shouldSkip: boolean;
  autoSelectedId?: string;
} {
  if (clinics && clinics.length === 1) {
    return { shouldSkip: true, autoSelectedId: clinics[0].id };
  }
  return { shouldSkip: false };
}

/**
 * Checks if single doctor applies (doctor auto-selected with intro card).
 */
export function checkDoctorAutoSelect(doctors: PublicBookingDoctorItem[]): {
  isSingleDoctor: boolean;
  autoSelectedDoctor?: PublicBookingDoctorItem;
} {
  if (doctors && doctors.length === 1) {
    return { isSingleDoctor: true, autoSelectedDoctor: doctors[0] };
  }
  return { isSingleDoctor: false };
}

/**
 * Validates step 1 contact details (name, phone, optional email).
 */
export function validateContactDetails(
  name: string,
  phone: string,
  email?: string
): {
  isValid: boolean;
  nameError?: string;
  phoneError?: string;
  emailError?: string;
} {
  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();
  const trimmedEmail = (email || "").trim();

  let nameError: string | undefined;
  let phoneError: string | undefined;
  let emailError: string | undefined;

  if (trimmedName.length < 2) {
    nameError = "Please provide your full name.";
  }

  const phoneDigits = trimmedPhone.replace(/\D/g, "");
  if (phoneDigits.length < 7) {
    phoneError = "Please provide a valid mobile number.";
  }

  if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    emailError = "Please enter a valid email address.";
  }

  const isValid = !nameError && !phoneError && !emailError;
  return { isValid, nameError, phoneError, emailError };
}

/**
 * Safely normalizes URL `?step=N` query parameters into a valid FlowStep.
 */
export function normalizeUrlStep(stepParam: string | null | undefined): FlowStep {
  if (stepParam === null || stepParam === undefined) return 0;
  const parsed = parseInt(stepParam, 10);
  if (isNaN(parsed) || parsed < 0 || parsed > 5) return 0;
  return parsed as FlowStep;
}

/**
 * Invalidation state resetters for upstream choice alterations.
 */
export function resetSelectionsOnServiceChange() {
  return {
    selectedCity: "",
    selectedClinic: "",
    selectedDoctor: "",
    selectedDate: "",
    selectedTime: "",
  };
}

export function resetSelectionsOnClinicChange() {
  return {
    selectedDoctor: "",
    selectedDate: "",
    selectedTime: "",
  };
}

export function resetSelectionsOnDoctorChange() {
  return {
    selectedDate: "",
    selectedTime: "",
  };
}

/**
 * Computes the next step from currentStep taking auto-skip rules into account.
 */
export function getNextStep(
  currentStep: FlowStep,
  ctx?: {
    servicesCount?: number;
    clinicsCount?: number;
    singleDoctor?: boolean;
    allowSkip?: boolean;
  }
): FlowStep {
  const allowSkip = ctx?.allowSkip ?? true;
  const servicesCount = ctx?.servicesCount ?? 2;
  const clinicsCount = ctx?.clinicsCount ?? 2;
  const singleDoctor = ctx?.singleDoctor ?? false;

  if (currentStep === 0) {
    if (allowSkip && servicesCount === 1) {
      if (clinicsCount === 1) {
        if (singleDoctor) return 4;
        return 3;
      }
      return 2;
    }
    return 1;
  }

  if (currentStep === 1) {
    if (allowSkip && clinicsCount === 1) {
      if (singleDoctor) return 4;
      return 3;
    }
    return 2;
  }

  if (currentStep === 2) {
    if (allowSkip && singleDoctor) {
      return 4;
    }
    return 3;
  }

  if (currentStep === 3) {
    return 4;
  }

  if (currentStep === 4) {
    return 5;
  }

  return 5;
}

/**
 * Computes the previous step from currentStep taking auto-skip rules into account.
 */
export function getPreviousStep(
  currentStep: FlowStep,
  ctx?: {
    servicesCount?: number;
    clinicsCount?: number;
    singleDoctor?: boolean;
    allowSkip?: boolean;
  }
): FlowStep {
  const allowSkip = ctx?.allowSkip ?? true;
  const servicesCount = ctx?.servicesCount ?? 2;
  const clinicsCount = ctx?.clinicsCount ?? 2;
  const singleDoctor = ctx?.singleDoctor ?? false;

  if (currentStep === 5) {
    return 4;
  }

  if (currentStep === 4) {
    if (allowSkip && singleDoctor) {
      if (clinicsCount === 1) {
        if (servicesCount === 1) return 0;
        return 1;
      }
      return 2;
    }
    return 3;
  }

  if (currentStep === 3) {
    if (allowSkip && clinicsCount === 1) {
      if (servicesCount === 1) {
        return 0;
      }
      return 1;
    }
    return 2;
  }

  if (currentStep === 2) {
    if (allowSkip && servicesCount === 1) {
      return 0;
    }
    return 1;
  }

  if (currentStep === 1) {
    return 0;
  }

  return 0;
}

