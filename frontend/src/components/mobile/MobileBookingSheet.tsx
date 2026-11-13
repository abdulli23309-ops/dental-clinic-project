"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { BottomSheet } from "./BottomSheet";
import { ProgressiveBookingFlow } from "@/components/booking/progressive-booking-flow";
import { usePublicContent } from "@/components/providers/public-content-provider";

interface BookingSheetContextType {
  isOpen: boolean;
  openBooking: (params?: { serviceId?: string; clinicId?: string; doctorId?: string }) => void;
  closeBooking: () => void;
  initialParams?: { serviceId?: string; clinicId?: string; doctorId?: string };
}

const BookingSheetContext = createContext<BookingSheetContextType>({
  isOpen: false,
  openBooking: () => {},
  closeBooking: () => {},
});

export function useMobileBooking() {
  return useContext(BookingSheetContext);
}

export function MobileBookingProvider({ children }: { children: React.ReactNode }) {
  const { locale } = usePublicContent();
  const isUrdu = locale === "ur";
  const [isOpen, setIsOpen] = useState(false);
  const [initialParams, setInitialParams] = useState<{
    serviceId?: string;
    clinicId?: string;
    doctorId?: string;
  }>();

  const openBooking = useCallback(
    (params?: { serviceId?: string; clinicId?: string; doctorId?: string }) => {
      setInitialParams(params);
      setIsOpen(true);
    },
    []
  );

  const closeBooking = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <BookingSheetContext.Provider
      value={{ isOpen, openBooking, closeBooking, initialParams }}
    >
      {children}
      <BottomSheet
        isOpen={isOpen}
        onClose={closeBooking}
        title={isUrdu ? "ملاقات کا وقت بک کریں" : "Book Appointment"}
        subtitle={isUrdu ? "ماہر معالج کے ساتھ مشاورت کا وقت طے کریں" : "Schedule your specialist clinical consultation"}
      >
        <div className="py-2 px-1 max-h-[75dvh] overflow-y-auto no-scrollbar">
          <ProgressiveBookingFlow
            initialServiceId={initialParams?.serviceId}
            initialClinicId={initialParams?.clinicId}
            initialDoctorId={initialParams?.doctorId}
          />
        </div>
      </BottomSheet>
    </BookingSheetContext.Provider>
  );
}
