"use client";

import React, { useEffect, useState, useRef, useId, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  X,
  Building2,
  Clock,
  MapPin,
  Phone,
  Mail,
  Stethoscope,
  Sparkles,
  Tag,
  Check,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  ServiceItem,
  TeamMember,
  LocationItem,
  DoctorBranchAssignment,
  DoctorServiceAssignment,
  LocationServiceItem,
  getDoctorBranches,
  getDoctorServices,
  adminGetLocationServices,
  resolveMediaUrl,
} from "@/lib/api";

export type EntityType = "service" | "clinician" | "branch";

export interface SelectedEntity {
  type: EntityType;
  id: string;
  data?: ServiceItem | TeamMember | LocationItem | any;
}

interface EntityDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEntity: SelectedEntity | null;
  allServices?: ServiceItem[];
  allTeamMembers?: TeamMember[];
  allLocations?: LocationItem[];
  accessToken?: string | null;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function EntityDetailsModal({
  isOpen,
  onClose,
  initialEntity,
  allServices = [],
  allTeamMembers = [],
  allLocations = [],
  accessToken,
  triggerRef,
}: EntityDetailsModalProps) {
  const [currentEntity, setCurrentEntity] = useState<SelectedEntity | null>(null);
  const [history, setHistory] = useState<SelectedEntity[]>([]);
  const prefersReduced = useReducedMotion();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  // Relational data states
  const [loadingRelational, setLoadingRelational] = useState(false);
  const [doctorBranches, setDoctorBranches] = useState<DoctorBranchAssignment[]>([]);
  const [doctorServices, setDoctorServices] = useState<DoctorServiceAssignment[]>([]);
  const [locationServices, setLocationServices] = useState<LocationServiceItem[]>([]);
  const [errorRelational, setErrorRelational] = useState<string | null>(null);

  // Sync initial entity when opened
  useEffect(() => {
    if (isOpen && initialEntity) {
      setCurrentEntity(initialEntity);
      setHistory([initialEntity]);
    } else if (!isOpen) {
      setCurrentEntity(null);
      setHistory([]);
      setDoctorBranches([]);
      setDoctorServices([]);
      setLocationServices([]);
      setErrorRelational(null);
    }
  }, [isOpen, initialEntity]);

  // Navigate to related entity
  const navigateTo = useCallback(
    (type: EntityType, id: string) => {
      let data: any = null;
      if (type === "service") {
        data = allServices.find((s) => s.id === id);
      } else if (type === "clinician") {
        data = allTeamMembers.find((m) => m.id === id);
      } else if (type === "branch") {
        data = allLocations.find((l) => l.id === id);
      }

      const next: SelectedEntity = { type, id, data };
      setHistory((prev) => [...prev, next]);
      setCurrentEntity(next);
    },
    [allServices, allTeamMembers, allLocations]
  );

  // Go back in entity history
  const goBack = useCallback(() => {
    if (history.length > 1) {
      const nextHistory = history.slice(0, -1);
      setHistory(nextHistory);
      setCurrentEntity(nextHistory[nextHistory.length - 1]);
    }
  }, [history]);

  // Fetch relational data on entity switch
  useEffect(() => {
    if (!isOpen || !currentEntity) return;

    let isCancelled = false;
    setLoadingRelational(true);
    setErrorRelational(null);

    const fetchData = async () => {
      try {
        if (currentEntity.type === "service") {
          // Fetch authorized clinicians & branches
          const [dsList, dbList] = await Promise.all([
            getDoctorServices(undefined, undefined, accessToken).catch(() => []),
            getDoctorBranches(undefined, undefined, accessToken).catch(() => []),
          ]);
          if (!isCancelled) {
            setDoctorServices(dsList.filter((ds) => ds.serviceId === currentEntity.id && ds.isActive));
            setDoctorBranches(dbList.filter((db) => db.isActive));
          }
        } else if (currentEntity.type === "clinician") {
          // Fetch doctor's assigned branches & authorized services
          const [dbList, dsList] = await Promise.all([
            getDoctorBranches(currentEntity.id, undefined, accessToken).catch(() => []),
            getDoctorServices(currentEntity.id, undefined, accessToken).catch(() => []),
          ]);
          if (!isCancelled) {
            setDoctorBranches(dbList.filter((db) => db.isActive));
            setDoctorServices(dsList.filter((ds) => ds.isActive));
          }
        } else if (currentEntity.type === "branch") {
          // Fetch assigned clinicians & location services
          const [dbList, lsList] = await Promise.all([
            getDoctorBranches(undefined, currentEntity.id, accessToken).catch(() => []),
            adminGetLocationServices(currentEntity.id, accessToken).catch(() => []),
          ]);
          if (!isCancelled) {
            setDoctorBranches(dbList.filter((db) => db.isActive));
            setLocationServices(lsList.filter((ls) => ls.isOffered));
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          setErrorRelational(err.message || "Failed to load connected records.");
        }
      } finally {
        if (!isCancelled) {
          setLoadingRelational(false);
        }
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, currentEntity, accessToken]);

  // Keyboard accessibility: Escape to close, focus trap & restoration
  useEffect(() => {
    if (!isOpen) return;

    // Lock background scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Auto-focus close button
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // Trap focus
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
      // Restore focus to opener
      triggerRef?.current?.focus?.();
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen || !currentEntity) return null;

  // Resolve entity data with fallbacks
  let entityData = currentEntity.data;
  if (!entityData) {
    if (currentEntity.type === "service") {
      entityData = allServices.find((s) => s.id === currentEntity.id);
    } else if (currentEntity.type === "clinician") {
      entityData = allTeamMembers.find((m) => m.id === currentEntity.id);
    } else if (currentEntity.type === "branch") {
      entityData = allLocations.find((l) => l.id === currentEntity.id);
    }
  }

  // Animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: prefersReduced ? 1 : 0.95, y: prefersReduced ? 0 : 10 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.35,
        ease: [0.25, 1, 0.5, 1] as const,
      },
    },
    exit: {
      opacity: 0,
      scale: prefersReduced ? 1 : 0.95,
      y: prefersReduced ? 0 : 10,
      transition: { duration: 0.2, ease: "easeIn" as const },
    },
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* Soft, Light Frosted-Glass Backdrop */}
        <motion.div
          className="fixed inset-0 bg-slate-800/10 backdrop-blur-sm"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={overlayVariants}
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Body Container with Continuity Morph & Expand */}
        <motion.div
          ref={modalRef}
          layoutId={!prefersReduced && currentEntity.type === "service" ? `service-entity-${currentEntity.id}` : undefined}
          transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
          className="relative w-full max-w-3xl rounded-3xl bg-white/95 dark:bg-slate-900/95 shadow-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden backdrop-blur-md z-10 my-8 max-h-[90vh] flex flex-col"
          style={{
            boxShadow:
              "0 20px 40px -15px rgba(30, 58, 138, 0.08), 0 0 0 1px rgba(226, 232, 240, 0.8)",
          }}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={modalVariants}
        >
          {/* Top Bar with Navigation & Close */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 shrink-0 bg-white/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              {history.length > 1 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  ← Back
                </button>
              )}
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                {currentEntity.type === "service"
                  ? "Dental Procedure"
                  : currentEntity.type === "clinician"
                    ? "Clinician Profile"
                    : "Practice Location"}
              </span>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close entity details"
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Scrollable Content */}
          <div className="overflow-y-auto p-6 sm:p-8 space-y-6 flex-1">
            {currentEntity.type === "service" && (
              <ServiceScenario
                service={entityData as ServiceItem}
                titleId={titleId}
                allTeamMembers={allTeamMembers}
                allLocations={allLocations}
                doctorServices={doctorServices}
                doctorBranches={doctorBranches}
                loadingRelational={loadingRelational}
                errorRelational={errorRelational}
                onSelectClinician={(id) => navigateTo("clinician", id)}
                onSelectBranch={(id) => navigateTo("branch", id)}
              />
            )}

            {currentEntity.type === "clinician" && (
              <ClinicianScenario
                clinician={entityData as TeamMember}
                titleId={titleId}
                allServices={allServices}
                allLocations={allLocations}
                doctorBranches={doctorBranches}
                doctorServices={doctorServices}
                loadingRelational={loadingRelational}
                errorRelational={errorRelational}
                onSelectBranch={(id) => navigateTo("branch", id)}
                onSelectService={(id) => navigateTo("service", id)}
              />
            )}

            {currentEntity.type === "branch" && (
              <BranchScenario
                branch={entityData as LocationItem}
                titleId={titleId}
                allTeamMembers={allTeamMembers}
                allServices={allServices}
                doctorBranches={doctorBranches}
                locationServices={locationServices}
                loadingRelational={loadingRelational}
                errorRelational={errorRelational}
                onSelectClinician={(id) => navigateTo("clinician", id)}
                onSelectService={(id) => navigateTo("service", id)}
              />
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/* =========================================================================
 * Scenario A: Service Details
 * ========================================================================= */
function ServiceScenario({
  service,
  titleId,
  allTeamMembers,
  allLocations,
  doctorServices,
  doctorBranches,
  loadingRelational,
  errorRelational,
  onSelectClinician,
  onSelectBranch,
}: {
  service: ServiceItem;
  titleId: string;
  allTeamMembers: TeamMember[];
  allLocations: LocationItem[];
  doctorServices: DoctorServiceAssignment[];
  doctorBranches: DoctorBranchAssignment[];
  loadingRelational: boolean;
  errorRelational: string | null;
  onSelectClinician: (id: string) => void;
  onSelectBranch: (id: string) => void;
}) {
  if (!service) {
    return <div className="text-sm text-muted-foreground text-center py-8">Service details unavailable.</div>;
  }

  // Derive authorized clinicians
  const authorizedDoctorIds = new Set(
    doctorServices.filter((ds) => ds.serviceId === service.id && ds.isActive).map((ds) => ds.teamMemberId)
  );
  // If service has explicit providerIds in model
  if (service.providerIds && service.providerIds.length > 0) {
    service.providerIds.forEach((id) => authorizedDoctorIds.add(id));
  }
  const authorizedDoctors = allTeamMembers.filter((m) => authorizedDoctorIds.has(m.id) && m.isActive);

  // Derive offering locations (either via service.clinicIds or clinics where authorized clinicians offer it)
  const offeredClinicIds = new Set<string>();
  if (service.clinicIds && service.clinicIds.length > 0) {
    service.clinicIds.forEach((id) => offeredClinicIds.add(id));
  }
  doctorServices
    .filter((ds) => ds.serviceId === service.id && ds.isActive && ds.clinicId)
    .forEach((ds) => offeredClinicIds.add(ds.clinicId!));

  const offeredLocations = allLocations.filter((l) => offeredClinicIds.has(l.id) && l.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start gap-4">
        {service.imageUrl ? (
          <div className="w-20 h-20 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shrink-0 bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveMediaUrl(service.imageUrl) || undefined}
              alt={service.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <Layers className="w-8 h-8" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[11px] font-semibold tracking-wide px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
              {service.category}
            </span>
            {service.code && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                {service.code}
              </span>
            )}
            {service.highlight && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Featured
              </span>
            )}
          </div>

          <h2 id={titleId} className="text-xl sm:text-2xl font-bold text-foreground font-display">
            {service.title}
          </h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {service.shortDesc || service.fullDesc || "No clinical description provided."}
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 text-xs">
        <div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
            Standard Fee
          </span>
          <span className="font-bold text-sm text-foreground">{service.cashPrice || "Standard"}</span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
            Duration
          </span>
          <span className="font-bold text-sm text-foreground">{service.duration || "45 min"}</span>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
            Operatory Buffer
          </span>
          <span className="font-bold text-sm text-foreground">
            {service.bufferMinutes ? `+${service.bufferMinutes}m buffer` : "0m standard"}
          </span>
        </div>
      </div>

      {/* SECTION 1: Available At */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-primary" />
          Available At Practice Locations ({offeredLocations.length})
        </h3>

        {loadingRelational ? (
          <div className="text-xs text-muted-foreground py-3">Loading active branch locations...</div>
        ) : offeredLocations.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-border text-xs text-muted-foreground text-center">
            This procedure is not currently tied to a specific branch. It can be performed across all clinic facilities.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {offeredLocations.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => onSelectBranch(loc.id)}
                className="p-3 rounded-xl border border-border bg-card hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                    {loc.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {loc.addressLine1}, {loc.city}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: Performed By */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Stethoscope className="w-3.5 h-3.5 text-primary" />
          Authorized Clinicians ({authorizedDoctors.length})
        </h3>

        {loadingRelational ? (
          <div className="text-xs text-muted-foreground py-3">Loading authorized doctors...</div>
        ) : authorizedDoctors.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-border text-xs text-muted-foreground text-center">
            No specific clinicians are currently authorized for this service in the schedule matrix.
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar">
            {authorizedDoctors.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => onSelectClinician(doc.id)}
                className="flex items-center gap-3 p-2.5 pr-4 rounded-2xl border border-border bg-card hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all shrink-0 group text-left cursor-pointer"
              >
                {doc.photoUrl ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-border shrink-0 bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveMediaUrl(doc.photoUrl) || undefined}
                      alt={doc.displayName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                    {doc.displayName.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                    {doc.displayName}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {doc.professionalTitle || doc.role || "Clinician"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {errorRelational && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
          {errorRelational}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
 * Scenario B: Clinician / Doctor Details
 * ========================================================================= */
function ClinicianScenario({
  clinician,
  titleId,
  allServices,
  allLocations,
  doctorBranches,
  doctorServices,
  loadingRelational,
  errorRelational,
  onSelectBranch,
  onSelectService,
}: {
  clinician: TeamMember;
  titleId: string;
  allServices: ServiceItem[];
  allLocations: LocationItem[];
  doctorBranches: DoctorBranchAssignment[];
  doctorServices: DoctorServiceAssignment[];
  loadingRelational: boolean;
  errorRelational: string | null;
  onSelectBranch: (id: string) => void;
  onSelectService: (id: string) => void;
}) {
  if (!clinician) {
    return <div className="text-sm text-muted-foreground text-center py-8">Clinician details unavailable.</div>;
  }

  // Derive assigned branches
  const assignedBranchIds = new Set<string>();
  if (clinician.locationId) assignedBranchIds.add(clinician.locationId);
  doctorBranches.filter((db) => db.teamMemberId === clinician.id && db.isActive).forEach((db) => assignedBranchIds.add(db.clinicId));
  const assignedBranches = allLocations.filter((l) => assignedBranchIds.has(l.id) && l.isActive);

  // Derive authorized services
  const authorizedServiceIds = new Set(
    doctorServices.filter((ds) => ds.teamMemberId === clinician.id && ds.isActive).map((ds) => ds.serviceId)
  );
  const authorizedServices = allServices.filter((s) => authorizedServiceIds.has(s.id));

  // Group services by category
  const servicesByCategory: Record<string, ServiceItem[]> = {};
  authorizedServices.forEach((s) => {
    const cat = s.category || "General";
    if (!servicesByCategory[cat]) servicesByCategory[cat] = [];
    servicesByCategory[cat].push(s);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start gap-4">
        {clinician.photoUrl ? (
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-500/20 shrink-0 bg-muted shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveMediaUrl(clinician.photoUrl) || undefined}
              alt={clinician.displayName}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-24 h-24 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-2xl flex items-center justify-center shrink-0">
            {clinician.displayName.charAt(0)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {clinician.role || "Practitioner"}
            </span>
            {clinician.credentials && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                {clinician.credentials}
              </span>
            )}
          </div>

          <h2 id={titleId} className="text-xl sm:text-2xl font-bold text-foreground font-display">
            {clinician.displayName}
          </h2>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">
            {clinician.professionalTitle || "Associate Dental Surgeon"}
          </p>

          {/* Specialties Pills */}
          {clinician.specialties && clinician.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {clinician.specialties.map((spec, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                >
                  {spec}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Biography */}
      {clinician.biography && (
        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {clinician.biography}
        </div>
      )}

      {/* SECTION 1: Assigned Clinics / Locations */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-primary" />
          Assigned Clinics / Locations ({assignedBranches.length})
        </h3>

        {loadingRelational ? (
          <div className="text-xs text-muted-foreground py-3">Loading clinician branch assignments...</div>
        ) : assignedBranches.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-border text-xs text-muted-foreground text-center">
            No specific branch assignments recorded.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {assignedBranches.map((branch) => (
              <button
                key={branch.id}
                type="button"
                onClick={() => onSelectBranch(branch.id)}
                className="px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 border border-border text-xs font-medium text-foreground transition-all flex items-center gap-2 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>{branch.name}</span>
                <span className="text-[10px] text-muted-foreground">({branch.city})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: Authorized Procedures / Services */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Stethoscope className="w-3.5 h-3.5 text-primary" />
          Authorized Procedures ({authorizedServices.length})
        </h3>

        {loadingRelational ? (
          <div className="text-xs text-muted-foreground py-3">Loading authorized procedures...</div>
        ) : authorizedServices.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-border text-xs text-muted-foreground text-center">
            No procedure authorizations found for this clinician.
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(servicesByCategory).map(([cat, list]) => (
              <div key={cat} className="space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {cat}
                </span>
                <div className="flex flex-wrap gap-2">
                  {list.map((srv) => (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => onSelectService(srv.id)}
                      className="px-3 py-1.5 rounded-xl border border-border bg-card hover:border-emerald-500/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 text-xs font-medium text-foreground transition-all flex items-center gap-1.5 group cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                        {srv.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {srv.duration || "45m"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {errorRelational && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
          {errorRelational}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
 * Scenario C: Branch / Location Details
 * ========================================================================= */
function BranchScenario({
  branch,
  titleId,
  allTeamMembers,
  allServices,
  doctorBranches,
  locationServices,
  loadingRelational,
  errorRelational,
  onSelectClinician,
  onSelectService,
}: {
  branch: LocationItem;
  titleId: string;
  allTeamMembers: TeamMember[];
  allServices: ServiceItem[];
  doctorBranches: DoctorBranchAssignment[];
  locationServices: LocationServiceItem[];
  loadingRelational: boolean;
  errorRelational: string | null;
  onSelectClinician: (id: string) => void;
  onSelectService: (id: string) => void;
}) {
  if (!branch) {
    return <div className="text-sm text-muted-foreground text-center py-8">Branch details unavailable.</div>;
  }

  // Assigned doctors
  const assignedDocIds = new Set(
    doctorBranches.filter((db) => db.clinicId === branch.id && db.isActive).map((db) => db.teamMemberId)
  );
  allTeamMembers.filter((m) => m.locationId === branch.id).forEach((m) => assignedDocIds.add(m.id));
  const assignedDoctors = allTeamMembers.filter((m) => assignedDocIds.has(m.id) && m.isActive);

  // Offered services
  const offeredServiceIds = new Set(locationServices.filter((ls) => ls.isOffered).map((ls) => ls.id));
  const offeredServices = allServices.filter(
    (s) => offeredServiceIds.has(s.id) || (s.clinicIds && s.clinicIds.includes(branch.id))
  );

  return (
    <div className="space-y-6">
      {/* Header with image */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-muted h-44 sm:h-52">
        {branch.imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveMediaUrl(branch.imageUrl) || undefined}
              alt={branch.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-slate-900 flex items-center justify-center text-white/40">
            <Building2 className="w-16 h-16 opacity-30" />
          </div>
        )}

        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-primary text-white">
              {branch.isPrimary ? "Primary HQ Branch" : "Satellite Branch"}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white/90">
              {branch.city}
            </span>
          </div>

          <h2 id={titleId} className="text-xl sm:text-2xl font-bold font-display drop-shadow-sm">
            {branch.name}
          </h2>
          <p className="text-xs text-white/80 flex items-center gap-1.5 mt-0.5 drop-shadow-sm">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">
              {branch.addressLine1}
              {branch.addressLine2 ? `, ${branch.addressLine2}` : ""}, {branch.city}
            </span>
          </p>
        </div>
      </div>

      {/* Contact & Hours Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 text-xs">
        <div className="space-y-1.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
            Direct Contact
          </span>
          <div className="flex items-center gap-2 text-foreground">
            <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>{branch.phone || "+92 Clinic Main Line"}</span>
          </div>
          {branch.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{branch.email}</span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
            Operating Hours
          </span>
          <div className="flex items-start gap-2 text-foreground">
            <Clock className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <span className="whitespace-pre-line text-xs">{branch.hoursInfo || "Mon-Sat: 09:00 AM - 09:00 PM"}</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Medical Staff / Assigned Team */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Stethoscope className="w-3.5 h-3.5 text-primary" />
          Medical Staff / Assigned Team ({assignedDoctors.length})
        </h3>

        {loadingRelational ? (
          <div className="text-xs text-muted-foreground py-3">Loading branch clinicians...</div>
        ) : assignedDoctors.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-border text-xs text-muted-foreground text-center">
            No clinicians currently assigned to this branch.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {assignedDoctors.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => onSelectClinician(doc.id)}
                className="p-3 rounded-xl border border-border bg-card hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all flex items-center gap-3 text-left group cursor-pointer"
              >
                {doc.photoUrl ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-border shrink-0 bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveMediaUrl(doc.photoUrl) || undefined}
                      alt={doc.displayName}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                    {doc.displayName.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                    {doc.displayName}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {doc.specialties?.join(", ") || doc.professionalTitle || "Dentist"}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: Branch Services */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-primary" />
          Offered Clinical Procedures ({offeredServices.length})
        </h3>

        {loadingRelational ? (
          <div className="text-xs text-muted-foreground py-3">Loading branch services...</div>
        ) : offeredServices.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-border text-xs text-muted-foreground text-center">
            No specific services assigned to this branch yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-xl border border-border overflow-hidden bg-card">
            {offeredServices.map((srv) => (
              <button
                key={srv.id}
                type="button"
                onClick={() => onSelectService(srv.id)}
                className="w-full p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between text-left group cursor-pointer"
              >
                <div className="min-w-0 pr-4">
                  <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {srv.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {srv.category} • {srv.duration || "45m"}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-foreground">{srv.cashPrice || "Standard"}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {errorRelational && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
          {errorRelational}
        </div>
      )}
    </div>
  );
}

