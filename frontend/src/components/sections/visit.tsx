"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, MapPin, Navigation, Phone } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";

interface DemoClinic {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  hours: string;
  photoUrl: string;
  mapQuery: string;
}

const CITIES = [
  "Lahore",
  "Rawalpindi",
  "Islamabad",
  "Karachi",
  "Peshawar",
  "Faisalabad",
  "Multan",
];

const CLINICS_DATA: Record<string, DemoClinic[]> = {
  Lahore: [
    {
      id: "lhr-gulberg",
      name: "DentoCorrect Gulberg",
      address: "14-C, Main Boulevard, Gulberg III, Lahore",
      city: "Lahore",
      phone: "+92 42 3578 9101",
      hours: "Mon – Sat: 11:00 AM – 9:00 PM",
      photoUrl: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800&auto=format&fit=crop",
      mapQuery: "14-C+Main+Boulevard+Gulberg+III+Lahore",
    },
    {
      id: "lhr-johar",
      name: "DentoCorrect Johar Town",
      address: "42-G, Main Boulevard, Johar Town, Lahore",
      city: "Lahore",
      phone: "+92 42 3531 4455",
      hours: "Mon – Sat: 11:00 AM – 9:00 PM",
      photoUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800&auto=format&fit=crop",
      mapQuery: "Johar+Town+Main+Boulevard+Lahore",
    },
    {
      id: "lhr-dha",
      name: "DentoCorrect DHA Phase 5",
      address: "Plaza 18, CCA, Sector C, DHA Phase 5, Lahore",
      city: "Lahore",
      phone: "+92 42 3718 2233",
      hours: "Mon – Sat: 11:00 AM – 9:00 PM",
      photoUrl: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?q=80&w=800&auto=format&fit=crop",
      mapQuery: "DHA+Phase+5+CCA+Lahore",
    },
  ],
  Rawalpindi: [
    {
      id: "rwp-bahria",
      name: "DentoCorrect Bahria Town",
      address: "Civic Center, Phase 4, Bahria Town, Rawalpindi",
      city: "Rawalpindi",
      phone: "+92 51 5730 112",
      hours: "Mon – Sat: 11:00 AM – 9:00 PM",
      photoUrl: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800&auto=format&fit=crop",
      mapQuery: "Civic+Center+Phase+4+Bahria+Town+Rawalpindi",
    },
    {
      id: "rwp-saddar",
      name: "DentoCorrect Saddar",
      address: "32 Haider Road, Saddar, Rawalpindi",
      city: "Rawalpindi",
      phone: "+92 51 5562 889",
      hours: "Mon – Sat: 11:00 AM – 9:00 PM",
      photoUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800&auto=format&fit=crop",
      mapQuery: "Haider+Road+Saddar+Rawalpindi",
    },
  ],
  Islamabad: [
    {
      id: "isb-f7",
      name: "DentoCorrect F-7 Markaz",
      address: "Jinnah Super Market, F-7 Markaz, Islamabad",
      city: "Islamabad",
      phone: "+92 51 2654 321",
      hours: "Mon – Sat: 11:00 AM – 9:00 PM",
      photoUrl: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800&auto=format&fit=crop",
      mapQuery: "F-7+Markaz+Jinnah+Super+Islamabad",
    },
    {
      id: "isb-bluearea",
      name: "DentoCorrect Blue Area",
      address: "Executive Heights, Fazl-ul-Haq Road, Blue Area, Islamabad",
      city: "Islamabad",
      phone: "+92 51 2801 990",
      hours: "Mon – Sat: 11:00 AM – 9:00 PM",
      photoUrl: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?q=80&w=800&auto=format&fit=crop",
      mapQuery: "Blue+Area+Islamabad",
    },
  ],
  Karachi: [
    {
      id: "khi-clifton",
      name: "DentoCorrect Clifton",
      address: "Block 4, Near Bilawal Chowrangi, Clifton, Karachi",
      city: "Karachi",
      phone: "+92 21 3587 6543",
      hours: "Mon – Sat: 12:00 PM – 9:30 PM",
      photoUrl: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800&auto=format&fit=crop",
      mapQuery: "Clifton+Block+4+Karachi",
    },
    {
      id: "khi-dha6",
      name: "DentoCorrect DHA Phase 6",
      address: "Plot 24-C, Shahbaz Commercial, DHA Phase 6, Karachi",
      city: "Karachi",
      phone: "+92 21 3534 8877",
      hours: "Mon – Sat: 12:00 PM – 9:30 PM",
      photoUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800&auto=format&fit=crop",
      mapQuery: "Shahbaz+Commercial+DHA+Phase+6+Karachi",
    },
  ],
  Peshawar: [
    {
      id: "psh-univ",
      name: "DentoCorrect University Road",
      address: "Aman Plaza, Main University Road, Peshawar",
      city: "Peshawar",
      phone: "+92 91 5841 234",
      hours: "Mon – Sat: 11:00 AM – 8:30 PM",
      photoUrl: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800&auto=format&fit=crop",
      mapQuery: "University+Road+Peshawar",
    },
  ],
  Faisalabad: [
    {
      id: "fsd-kohinoor",
      name: "DentoCorrect Kohinoor City",
      address: "Civic Center, Jaranwala Road, Kohinoor City, Faisalabad",
      city: "Faisalabad",
      phone: "+92 41 8540 765",
      hours: "Mon – Sat: 11:00 AM – 9:00 PM",
      photoUrl: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?q=80&w=800&auto=format&fit=crop",
      mapQuery: "Kohinoor+City+Faisalabad",
    },
  ],
  Multan: [
    {
      id: "mul-bosan",
      name: "DentoCorrect Bosan Road",
      address: "Gulgasht Colony, Near Gol Bagh, Bosan Road, Multan",
      city: "Multan",
      phone: "+92 61 6523 998",
      hours: "Mon – Sat: 11:00 AM – 9:00 PM",
      photoUrl: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800&auto=format&fit=crop",
      mapQuery: "Gulgasht+Colony+Bosan+Road+Multan",
    },
  ],
};

export function Visit() {
  const [selectedCity, setSelectedCity] = useState<string>("Lahore");

  const clinics = CLINICS_DATA[selectedCity] || CLINICS_DATA["Lahore"];

  return (
    <section id="visit" className="border-t border-line bg-bone py-20 md:py-28">
      <div className="container-x space-y-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <SectionHeading
              eyebrow="Nationwide Network"
              title={
                <>
                  Our Nationwide Clinics
                  <br />
                  &amp; Modern Facilities
                </>
              }
            />
          </div>
          <p className="max-w-md text-sm leading-relaxed text-ink-soft">
            Explore dedicated branch clinics designed with state-of-the-art sterilizers, private operatory suites, and dedicated on-site parking.
          </p>
        </div>

        {/* City Pill Tabs */}
        <div className="border-b border-line pb-4 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {CITIES.map((city) => {
            const isSelected = selectedCity === city;
            return (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`rounded-full px-5 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary text-white shadow-subtle font-semibold"
                    : "bg-cream text-ink-soft hover:text-ink hover:bg-sand/60 border border-line"
                }`}
              >
                {city}
              </button>
            );
          })}
        </div>

        {/* Full-Width Horizontal Clinic Cards */}
        <div className="space-y-4">
          {clinics.map((clinic) => (
            <div
              key={clinic.id}
              className="w-full rounded-2xl border border-line/80 bg-white dark:bg-neutral-900 p-4 sm:p-6 shadow-sm hover:shadow-card transition-all duration-200"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                {/* Left: Interior Clinic Photo + Middle: Clinic Details */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 min-w-0">
                  {/* Photo */}
                  <img
                    src={clinic.photoUrl}
                    alt={clinic.name}
                    className="w-full sm:w-36 md:w-44 h-36 sm:h-28 rounded-xl object-cover shrink-0 shadow-sm border border-line/50"
                    loading="lazy"
                  />

                  {/* Middle Info */}
                  <div className="space-y-1.5 min-w-0">
                    <h3 className="font-display text-lg sm:text-xl font-bold text-ink leading-snug">
                      {clinic.name}
                    </h3>

                    <p className="flex items-start gap-1.5 text-xs sm:text-sm text-ink-soft">
                      <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{clinic.address}</span>
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft pt-1">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-secondary" />
                        <span>{clinic.phone}</span>
                      </span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="h-3 w-3 text-ink-soft/70" />
                        <span>{clinic.hours}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Get Directions Link & Book Appointment Button */}
                <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/50">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${clinic.mapQuery}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline hover:text-forest-deep transition-colors"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    <span>Get Directions</span>
                  </a>

                  <Link
                    href={`/book?clinic=${clinic.id}`}
                    className="inline-flex items-center justify-center rounded-full bg-ink text-[#FAF7F2] hover:bg-primary px-5 py-2.5 text-xs sm:text-sm font-semibold shadow-subtle hover:shadow-card hover:-translate-y-0.5 transition-all"
                  >
                    <span>Book Appointment</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Visit;
