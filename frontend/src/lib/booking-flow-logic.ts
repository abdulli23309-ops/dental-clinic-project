import {
  PublicBookingServiceItem,
  PublicBookingClinicItem,
  PublicBookingDoctorItem,
} from "./api";

export type FlowStep = 0 | 1 | 2 | 3 | 4 | 5;

export interface FlowContext {
  services: PublicBookingServiceItem[];
  clinics: PublicBookingClinicItem[];
  doctors: PublicBookingDoctorItem[];
  selectedService: string;
  selectedClinic: string;
  selectedDoctor: string;
  selectedDate: string;
  selectedTime: string;
  contactName: string;
  contactPhone: string;
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
 * Computes the next step from currentStep taking auto-skip rules into account.
 */
export function getNextStep(
  currentStep: FlowStep,
  ctx: {
    servicesCount: number;
    clinicsCount: number;
  }
): FlowStep {
  if (currentStep === 0) {
    // Moving from Contact:
    if (ctx.servicesCount === 1) {
      if (ctx.clinicsCount === 1) {
        return 3; // Skip service & clinic -> Doctor & Time
      }
      return 2; // Skip service -> Clinic
    }
    return 1;
  }

  if (currentStep === 1) {
    // Moving from Service:
    if (ctx.clinicsCount === 1) {
      return 3; // Skip clinic -> Doctor & Time
    }
    return 2;
  }

  if (currentStep === 2) {
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
  ctx: {
    servicesCount: number;
    clinicsCount: number;
  }
): FlowStep {
  if (currentStep === 5) {
    return 4;
  }

  if (currentStep === 4) {
    return 3;
  }

  if (currentStep === 3) {
    // Back from Doctor & Time:
    if (ctx.clinicsCount === 1) {
      if (ctx.servicesCount === 1) {
        return 0; // Skip back past clinic and service -> Contact
      }
      return 1; // Skip back past clinic -> Service
    }
    return 2;
  }

  if (currentStep === 2) {
    // Back from Clinic:
    if (ctx.servicesCount === 1) {
      return 0; // Skip back past service -> Contact
    }
    return 1;
  }

  if (currentStep === 1) {
    return 0;
  }

  return 0;
}
