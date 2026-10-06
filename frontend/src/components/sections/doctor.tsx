"use client";

import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";

interface DemoDoctor {
  id: string;
  name: string;
  credentials: string;
  title: string;
  city: string;
  photoUrl: string;
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

const DOCTOR_DATA: Record<string, DemoDoctor[]> = {
  Lahore: [
    {
      id: "lhr-1",
      name: "Dr. Kinza Siddique",
      credentials: "BDS, C-Ortho UK",
      title: "General Dentist & Clinical Executive",
      city: "Lahore",
      photoUrl: "https://images.unsplash.com/photo-1594824813639-65fe002495d4?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: "lhr-2",
      name: "Dr. Ayesha Mansha",
      credentials: "BDS, RDS (Gold Medalist)",
      title: "Clinical Executive & Aesthetic Specialist",
      city: "Lahore",
      photoUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: "lhr-3",
      name: "Dr. Hamza Tariq",
      credentials: "BDS, FCPS (Orthodontics)",
      title: "Consultant Orthodontist",
      city: "Lahore",
      photoUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: "lhr-4",
      name: "Dr. Mahnoor Khan",
      credentials: "BDS, MSc Oral Surgery",
      title: "Restorative Dental Surgeon",
      city: "Lahore",
      photoUrl: "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?q=80&w=800&auto=format&fit=crop",
    },
  ],
  Rawalpindi: [
    {
      id: "rwp-1",
      name: "Dr. Zeeshan Haider",
      credentials: "BDS, RDS",
      title: "Senior Dental Surgeon",
      city: "Rawalpindi",
      photoUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: "rwp-2",
      name: "Dr. Sara Farooq",
      credentials: "BDS, C-Implantology",
      title: "Periodontics & Implant Associate",
      city: "Rawalpindi",
      photoUrl: "https://images.unsplash.com/photo-1594824813639-65fe002495d4?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: "rwp-3",
      name: "Dr. Bilal Aslam",
      credentials: "BDS, RDS",
      title: "Clinical Executive",
      city: "Rawalpindi",
      photoUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=800&auto=format&fit=crop",
    },
  ],
  Islamabad: [
    {
      id: "isb-1",
      name: "Dr. Zainab Malik",
      credentials: "BDS, M.Phil Oral Biology",
      title: "Aesthetic & Restorative Clinician",
      city: "Islamabad",
      photoUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: "isb-2",
      name: "Dr. Usman Rasheed",
      credentials: "BDS, FCPS (Orthodontics)",
      title: "Lead Orthodontics Consultant",
      city: "Islamabad",
      photoUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: "isb-3",
      name: "Dr. Sana Javed",
      credentials: "BDS, RDS",
      title: "Pediatric & Preventive Specialist",
      city: "Islamabad",
      photoUrl: "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?q=80&w=800&auto=format&fit=crop",
    },
  ],
  Karachi: [
    {
      id: "khi-1",
      name: "Dr. Farhan Siddiqui",
      credentials: "BDS, MSc Prosthodontics (UK)",
      title: "Clinical Director",
      city: "Karachi",
      photoUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: "khi-2",
      name: "Dr. Mariam Qureshi",
      credentials: "BDS, RDS",
      title: "Cosmetic Dentist",
      city: "Karachi",
      photoUrl: "https://images.unsplash.com/photo-1594824813639-65fe002495d4?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: "khi-3",
      name: "Dr. Ali Raza",
      credentials: "BDS, C-Endo",
      title: "Endodontic Surgeon",
      city: "Karachi",
      photoUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=800&auto=format&fit=crop",
    },
  ],
  Peshawar: [
    {
      id: "psh-1",
      name: "Dr. Tariq Afridi",
      credentials: "BDS, RDS",
      title: "Senior Dental Surgeon",
      city: "Peshawar",
      photoUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: "psh-2",
      name: "Dr. Gulalai Khattak",
      credentials: "BDS, C-Ortho",
      title: "General Dentist & Orthodontic Associate",
      city: "Peshawar",
      photoUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=800&auto=format&fit=crop",
    },
  ],
  Faisalabad: [
    {
      id: "fsd-1",
      name: "Dr. Ahmad Hassan",
      credentials: "BDS, RDS",
      title: "General Dentist",
      city: "Faisalabad",
      photoUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: "fsd-2",
      name: "Dr. Hira Chaudhry",
      credentials: "BDS, C-Aesthetics",
      title: "Restorative Specialist",
      city: "Faisalabad",
      photoUrl: "https://images.unsplash.com/photo-1594824813639-65fe002495d4?q=80&w=800&auto=format&fit=crop",
    },
  ],
  Multan: [
    {
      id: "mul-1",
      name: "Dr. Saad Qureshi",
      credentials: "BDS, RDS",
      title: "Clinical Executive",
      city: "Multan",
      photoUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: "mul-2",
      name: "Dr. Nida Fatima",
      credentials: "BDS, RDS",
      title: "Aesthetic Dentist",
      city: "Multan",
      photoUrl: "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?q=80&w=800&auto=format&fit=crop",
    },
  ],
};

export function Doctor() {
  const [selectedCity, setSelectedCity] = useState<string>("Lahore");
  const scrollRef = useRef<HTMLDivElement>(null);

  const doctors = DOCTOR_DATA[selectedCity] || DOCTOR_DATA["Lahore"];

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -320, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: "smooth" });
    }
  };

  return (
    <section id="team" className="border-t border-line bg-bone py-20 md:py-28 overflow-hidden">
      <div className="container-x space-y-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <SectionHeading
              eyebrow="Clinical Specialists"
              title={
                <>
                  Meet Our Team
                  <br />
                  &amp; Dental Experts
                </>
              }
            />
          </div>
          <p className="max-w-md text-sm leading-relaxed text-ink-soft">
            Our experienced dental surgeons, clinical executives, and orthodontic specialists provide comprehensive, gentle care across all nationwide clinics.
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

        {/* Cards Row with Navigation Arrows */}
        <div className="relative">
          {/* Left Arrow */}
          <button
            onClick={scrollLeft}
            aria-label="Previous doctors"
            className="hidden md:grid absolute -left-5 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full border border-line bg-white/95 dark:bg-black/90 shadow-md text-ink hover:bg-sand/40 hover:scale-105 active:scale-95 transition-all place-items-center cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Right Arrow */}
          <button
            onClick={scrollRight}
            aria-label="Next doctors"
            className="hidden md:grid absolute -right-5 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full border border-line bg-white/95 dark:bg-black/90 shadow-md text-ink hover:bg-sand/40 hover:scale-105 active:scale-95 transition-all place-items-center cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Horizontally Scrollable Row of Vertical Doctor Cards */}
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin snap-x snap-mandatory px-1"
          >
            {doctors.map((doc) => (
              <div
                key={doc.id}
                className="w-[260px] sm:w-[280px] shrink-0 snap-start"
              >
                {/* Vertical Card with Light Gray Background */}
                <div className="h-full rounded-2xl border border-line/80 bg-[#F8F9FA] dark:bg-white/5 p-4 flex flex-col items-center text-center shadow-subtle hover:shadow-card hover:-translate-y-1 transition-all duration-200">
                  {/* Doctor Image */}
                  <div className="w-full aspect-[4/5] rounded-xl overflow-hidden bg-gray-200 dark:bg-neutral-800 mb-4 relative shadow-sm">
                    {doc.photoUrl ? (
                      <img
                        src={doc.photoUrl}
                        alt={doc.name}
                        className="w-full h-full object-cover object-top"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-gray-400">
                        <User className="h-12 w-12" />
                      </div>
                    )}
                  </div>

                  {/* Doctor Info */}
                  <div className="space-y-1.5 flex-1 flex flex-col justify-between w-full">
                    <div>
                      <h3 className="font-display text-base sm:text-lg font-bold text-ink leading-snug">
                        {doc.name}
                      </h3>
                      <p className="text-xs font-semibold text-secondary uppercase tracking-wider mt-0.5">
                        {doc.credentials}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-line/50">
                      <p className="text-xs text-ink-soft font-medium leading-relaxed">
                        {doc.title}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Doctor;
