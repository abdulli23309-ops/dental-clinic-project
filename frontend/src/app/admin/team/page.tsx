"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  Clock,
  Compass,
  Edit2,
  ExternalLink,
  GraduationCap,
  Info,
  Layers,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";
import { AnimatedPage } from "@/components/ui/animated-page";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { EntityDetailsModal, SelectedEntity } from "@/components/modals/entity-details-modal";
import { SuccessAlert } from "@/components/ui/success-draw";
import { ServiceItem, adminGetServices } from "@/lib/api";
import {
  adminCreateTeamMember,
  adminGetLocations,
  adminGetRoles,
  adminGetTeam,
  adminToggleTeamMemberStatus,
  adminUpdateTeamMember,
  adminUploadMedia,
  adminGetLocationServices,
  getDoctorBranches,
  setDoctorBranches,
  getDoctorServices,
  saveDoctorServiceAssignment,
  deleteDoctorServiceAssignment,
  adminGetProviderAvailabilities,
  adminSaveProviderAvailability,
  adminDeleteProviderAvailability,
  getDoctorOverrides,
  saveDoctorOverride,
  deleteDoctorOverride,
  resolveMediaUrl,
  LocationItem,
  RoleItem,
  TeamMember,
  DoctorBranchAssignment,
  DoctorServiceAssignment,
  ProviderAvailabilityItem,
  DoctorScheduleOverride,
  LocationServiceItem,
} from "@/lib/api";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function AdminTeamPage() {
  const { accessToken } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Location Filtering & Sorting
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [locationSearchQuery, setLocationSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"default" | "name" | "location">("default");

  // Entity Details Modal & Cross-entity state
  const [selectedEntityModal, setSelectedEntityModal] = useState<SelectedEntity | null>(null);
  const [allServices, setAllServices] = useState<ServiceItem[]>([]);
  const [allDoctorBranches, setAllDoctorBranches] = useState<DoctorBranchAssignment[]>([]);

  // Pagination states (Blueprint Phase 4)
  const [teamPage, setTeamPage] = useState(1);
  const [teamPageSize, setTeamPageSize] = useState(6);

  // Reset pagination on search / filter / sort
  useEffect(() => {
    setTeamPage(1);
  }, [searchQuery, roleFilter, statusFilter, locationFilter, sortBy]);



  // Selected Clinician for Detailed 5-Tab Management View
  const [selectedClinician, setSelectedClinician] = useState<TeamMember | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "locations" | "services" | "schedule" | "availability">("profile");

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && createModalOpen) {
        setCreateModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [createModalOpen]);

  const [createForm, setCreateForm] = useState({
    displayName: "",
    professionalTitle: "Associate Dental Surgeon",
    specialties: ["General Dentistry"] as string[],
    credentials: "BDS",
    education: "",
    biography: "",
    role: "doctor",
    locationId: "",
    photoUrl: "",
  });
  const [isUploadingCreatePhoto, setIsUploadingCreatePhoto] = useState(false);

  // Auto-reset form state whenever modal closes to prevent stale data
  useEffect(() => {
    if (!createModalOpen) {
      setCreateForm({
        displayName: "",
        professionalTitle: "Associate Dental Surgeon",
        specialties: ["General Dentistry"] as string[],
        credentials: "BDS",
        education: "",
        biography: "",
        role: "doctor",
        locationId: "",
        photoUrl: "",
      });
      setIsUploadingCreatePhoto(false);
      setErrorMessage(null);
    }
  }, [createModalOpen]);

  // Tab 1: Profile Form for Selected Clinician
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    professionalTitle: "Associate Dental Surgeon",
    specialties: "General Dentistry, Cosmetic",
    credentials: "BDS, RDS",
    biography: "",
    role: "doctor",
    locationId: "",
    photoUrl: "",
  });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Tab 2: Assigned Branches
  const [doctorBranches, setDoctorBranchesState] = useState<DoctorBranchAssignment[]>([]);
  const [selectedClinicIds, setSelectedClinicIds] = useState<string[]>([]);

  // Tab 3: Doctor-Service Configuration
  const [selectedBranchForServices, setSelectedBranchForServices] = useState<string>("");
  const [branchOfferedServices, setBranchOfferedServices] = useState<LocationServiceItem[]>([]);
  const [doctorServiceAssignments, setDoctorServiceAssignments] = useState<DoctorServiceAssignment[]>([]);
  const [customDurations, setCustomDurations] = useState<Record<string, number>>({});
  const [customBuffers, setCustomBuffers] = useState<Record<string, number>>({});

  // Tab 4: Weekly Recurring Shifts
  const [shifts, setShifts] = useState<ProviderAvailabilityItem[]>([]);
  const [newShift, setNewShift] = useState({
    dayOfWeek: 0,
    startTime: "09:00",
    endTime: "17:00",
    breakStartTime: "13:00",
    breakEndTime: "14:00",
    clinicId: "",
  });

  // Tab 5: Availability & Overrides
  const [overrides, setOverrides] = useState<DoctorScheduleOverride[]>([]);
  const [newOverride, setNewOverride] = useState({
    overrideDate: "",
    overrideType: "unavailable" as "unavailable" | "working" | "modified",
    reason: "",
    clinicId: "",
  });

  const loadInitialData = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [team, locs, r, dbList, sList] = await Promise.all([
        adminGetTeam(accessToken).catch(() => []),
        adminGetLocations(accessToken).catch(() => []),
        adminGetRoles(accessToken).catch(() => []),
        getDoctorBranches(undefined, undefined, accessToken).catch(() => []),
        adminGetServices(accessToken).catch(() => []),
      ]);
      setTeamMembers(team);
      setLocations(locs);
      setRoles(r);
      setAllDoctorBranches(dbList.filter((db) => db.isActive));
      setAllServices(sList);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load team data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      loadInitialData();
    });
  }, [accessToken]);

  // When a clinician is selected, load tab-specific data
  useEffect(() => {
    if (!selectedClinician) return;

    setProfileForm({
      displayName: selectedClinician.displayName,
      professionalTitle: selectedClinician.professionalTitle || "Associate Dental Surgeon",
      specialties: selectedClinician.specialties?.join(", ") || "General Dentistry",
      credentials: selectedClinician.credentials || "",
      biography: selectedClinician.biography || "",
      role: selectedClinician.role || "doctor",
      locationId: selectedClinician.locationId || "",
      photoUrl: selectedClinician.photoUrl || "",
    });

    if (activeTab === "locations") {
      loadDoctorBranches(selectedClinician.id);
    } else if (activeTab === "services") {
      loadDoctorServicesData(selectedClinician.id);
    } else if (activeTab === "schedule") {
      loadDoctorShifts(selectedClinician.id);
    } else if (activeTab === "availability") {
      loadDoctorOverridesData(selectedClinician.id);
    }
  }, [selectedClinician, activeTab]);

  const loadDoctorBranches = async (doctorId: string) => {
    if (!accessToken) return;
    try {
      const assignments = await getDoctorBranches(doctorId, undefined, accessToken);
      setDoctorBranchesState(assignments);
      setSelectedClinicIds(assignments.filter((a) => a.isActive).map((a) => a.clinicId));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load doctor branches.");
    }
  };

  const loadDoctorServicesData = async (doctorId: string) => {
    if (!accessToken) return;
    try {
      const [branches, assignments] = await Promise.all([
        getDoctorBranches(doctorId, undefined, accessToken),
        getDoctorServices(doctorId, undefined, accessToken),
      ]);
      setDoctorBranchesState(branches);
      setDoctorServiceAssignments(assignments);

      const activeBranchIds = branches.filter((a) => a.isActive).map((a) => a.clinicId);
      setSelectedClinicIds(activeBranchIds);

      const durations: Record<string, number> = {};
      const buffers: Record<string, number> = {};
      assignments.forEach((a) => {
        if (a.customDurationMinutes) durations[a.serviceId] = a.customDurationMinutes;
        if (a.bufferMinutes) buffers[a.serviceId] = a.bufferMinutes;
      });
      setCustomDurations(durations);
      setCustomBuffers(buffers);

      // Default branch selector to first assigned branch or first location
      const firstBranch =
        selectedBranchForServices && activeBranchIds.includes(selectedBranchForServices)
          ? selectedBranchForServices
          : activeBranchIds[0] || locations[0]?.id || "";
      if (firstBranch) {
        setSelectedBranchForServices(firstBranch);
        const srvs = await adminGetLocationServices(firstBranch, accessToken);
        setBranchOfferedServices(srvs.filter((s) => s.isOffered));
      } else {
        setSelectedBranchForServices("");
        setBranchOfferedServices([]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load doctor services.");
    }
  };

  const handleBranchSelectForServices = async (branchId: string) => {
    setSelectedBranchForServices(branchId);
    if (!accessToken || !branchId) return;
    try {
      const srvs = await adminGetLocationServices(branchId, accessToken);
      setBranchOfferedServices(srvs.filter((s) => s.isOffered));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load services for branch.");
    }
  };

  const loadDoctorShifts = async (doctorId: string) => {
    if (!accessToken) return;
    try {
      const avails = await adminGetProviderAvailabilities(doctorId, undefined, accessToken);
      setShifts(avails);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load shifts.");
    }
  };

  const loadDoctorOverridesData = async (doctorId: string) => {
    if (!accessToken) return;
    try {
      const ovs = await getDoctorOverrides(doctorId, undefined, accessToken);
      setOverrides(ovs);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load availability overrides.");
    }
  };

  // Tab 1: Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClinician || !accessToken) return;
    setIsSaving(true);
    setErrorMessage(null);

    const names = profileForm.displayName.trim().split(" ");
    const firstName = names[0] || "Dr.";
    const lastName = names.slice(1).join(" ") || "Doctor";
    const specialtiesList = profileForm.specialties
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const updated = await adminUpdateTeamMember(
        selectedClinician.id,
        {
          firstName,
          lastName,
          displayName: profileForm.displayName.trim(),
          professionalTitle: profileForm.professionalTitle.trim() || "Associate Dental Surgeon",
          role: profileForm.role || "doctor",
          specialties: specialtiesList,
          credentials: profileForm.credentials.trim() || null,
          biography: profileForm.biography.trim() || null,
          locationId: profileForm.locationId || null,
          photoUrl: profileForm.photoUrl.trim() || null,
        },
        accessToken
      );
      setSelectedClinician(updated);
      setTeamMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setSuccessMessage("Clinician profile details saved successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage("File exceeds maximum allowed size of 20MB.");
      return;
    }
    setIsUploadingPhoto(true);
    setErrorMessage(null);
    try {
      const res = await adminUploadMedia(file, accessToken);
      setProfileForm((prev) => ({ ...prev, photoUrl: res.url }));
      setSuccessMessage("Clinician photo uploaded successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload photo.";
      setErrorMessage(msg);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Tab 2: Save Assigned Locations
  const handleToggleClinicBranch = (clinicId: string) => {
    setSelectedClinicIds((prev) =>
      prev.includes(clinicId) ? prev.filter((id) => id !== clinicId) : [...prev, clinicId]
    );
  };

  const handleSaveBranches = async () => {
    if (!selectedClinician || !accessToken) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const updated = await setDoctorBranches(
        {
          teamMemberId: selectedClinician.id,
          clinicIds: selectedClinicIds,
        },
        accessToken
      );
      setDoctorBranchesState(updated);
      setSuccessMessage("Doctor branch assignments updated successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update branch assignments.");
    } finally {
      setIsSaving(false);
    }
  };

  // Tab 3: Authorize / De-authorize Doctor for Service at Branch
  const handleToggleServiceAuth = async (serviceId: string, currentAssignment?: DoctorServiceAssignment) => {
    if (!selectedClinician || !selectedBranchForServices || !accessToken) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      if (currentAssignment) {
        await deleteDoctorServiceAssignment(currentAssignment.id, accessToken);
        setDoctorServiceAssignments((prev) => prev.filter((a) => a.id !== currentAssignment.id));
        setSuccessMessage("Service authorization removed for this clinician.");
      } else {
        const created = await saveDoctorServiceAssignment(
          {
            teamMemberId: selectedClinician.id,
            serviceId: serviceId,
            clinicId: selectedBranchForServices,
            customDurationMinutes: customDurations[serviceId] || null,
            bufferMinutes: customBuffers[serviceId] || null,
            isActive: true,
          },
          accessToken
        );
        setDoctorServiceAssignments((prev) => [...prev, created]);
        setSuccessMessage("Clinician authorized to provide this procedure at this branch.");
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update service authorization.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDurationOverride = async (serviceId: string, currentAssignment?: DoctorServiceAssignment) => {
    if (!selectedClinician || !selectedBranchForServices || !accessToken) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const durationVal = customDurations[serviceId] !== undefined ? customDurations[serviceId] : (currentAssignment?.customDurationMinutes ?? null);
      const bufferVal = customBuffers[serviceId] !== undefined ? customBuffers[serviceId] : (currentAssignment?.bufferMinutes ?? null);

      const saved = await saveDoctorServiceAssignment(
        {
          teamMemberId: selectedClinician.id,
          serviceId: serviceId,
          clinicId: selectedBranchForServices,
          customDurationMinutes: durationVal ? Number(durationVal) : null,
          bufferMinutes: bufferVal !== null && bufferVal !== undefined && bufferVal !== ("" as any) ? Number(bufferVal) : null,
          isActive: true,
        },
        accessToken
      );
      setDoctorServiceAssignments((prev) =>
        prev.some((a) => a.id === saved.id)
          ? prev.map((a) => (a.id === saved.id ? saved : a))
          : [...prev, saved]
      );
      setSuccessMessage("Duration & buffer settings saved.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save duration override.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearDurationOverride = async (serviceId: string, currentAssignment?: DoctorServiceAssignment) => {
    if (!selectedClinician || !selectedBranchForServices || !accessToken) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const saved = await saveDoctorServiceAssignment(
        {
          teamMemberId: selectedClinician.id,
          serviceId: serviceId,
          clinicId: selectedBranchForServices,
          customDurationMinutes: null,
          bufferMinutes: null,
          isActive: true,
        },
        accessToken
      );
      setCustomDurations((prev) => {
        const next = { ...prev };
        delete next[serviceId];
        return next;
      });
      setCustomBuffers((prev) => {
        const next = { ...prev };
        delete next[serviceId];
        return next;
      });
      setDoctorServiceAssignments((prev) =>
        prev.map((a) => (a.id === saved.id ? saved : a))
      );
      setSuccessMessage("Reverted to service catalog default duration & buffer.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reset duration override.");
    } finally {
      setIsSaving(false);
    }
  };

  // Bulk authorize all services offered by the active branch
  const handleAuthorizeAllBranchServices = async () => {
    if (!selectedClinician || !selectedBranchForServices || !accessToken) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const promises = branchOfferedServices.map(async (srv) => {
        const existing = doctorServiceAssignments.find(
          (a) => a.serviceId === srv.id && a.clinicId === selectedBranchForServices
        );
        if (!existing) {
          return saveDoctorServiceAssignment(
            {
              teamMemberId: selectedClinician.id,
              serviceId: srv.id,
              clinicId: selectedBranchForServices,
              customDurationMinutes: customDurations[srv.id] || null,
              bufferMinutes: customBuffers[srv.id] || null,
              isActive: true,
            },
            accessToken
          );
        }
        return null;
      });
      await Promise.all(promises);
      const updated = await getDoctorServices(selectedClinician.id, undefined, accessToken);
      setDoctorServiceAssignments(updated);
      setSuccessMessage("All branch offerings authorized for this clinician.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to authorize all services.");
    } finally {
      setIsSaving(false);
    }
  };

  // Smart Defaults helper: role to default procedures mapping
  const ROLE_SERVICE_TITLES: Record<string, string[]> = {
    "General Dentist": [
      "Cleanings & Comprehensive Exam",
      "Tooth-Colored Fillings & Crowns",
      "Gentle Endodontics (Root Canals)",
      "Invisalign Clear Aligners",
      "Professional Enamel Whitening",
      "Same-Day Emergency Triage",
    ],
    "Dentist": [
      "Cleanings & Comprehensive Exam",
      "Tooth-Colored Fillings & Crowns",
      "Gentle Endodontics (Root Canals)",
      "Invisalign Clear Aligners",
      "Professional Enamel Whitening",
      "Same-Day Emergency Triage",
    ],
    "Hygienist": [
      "Cleanings & Comprehensive Exam",
      "Professional Enamel Whitening",
    ],
    "Endodontist": [
      "Gentle Endodontics (Root Canals)",
      "Same-Day Emergency Triage",
    ],
    "Orthodontist": [
      "Invisalign Clear Aligners",
      "Cleanings & Comprehensive Exam",
    ],
    "Oral Surgeon": [
      "Same-Day Emergency Triage",
      "Tooth-Colored Fillings & Crowns",
    ],
    "Periodontist": [
      "Cleanings & Comprehensive Exam",
      "Same-Day Emergency Triage",
    ],
    "Pediatric Dentist": [
      "Cleanings & Comprehensive Exam",
      "Tooth-Colored Fillings & Crowns",
      "Same-Day Emergency Triage",
    ],
    "Cosmetic Dentist": [
      "Professional Enamel Whitening",
      "Invisalign Clear Aligners",
      "Tooth-Colored Fillings & Crowns",
    ],
    "Prosthodontist": [
      "Tooth-Colored Fillings & Crowns",
      "Invisalign Clear Aligners",
    ],
    "Implantologist": [
      "Same-Day Emergency Triage",
    ],
  };

  const handleQuickAssignBranch = async (branchId: string) => {
    if (!selectedClinician || !branchId || !accessToken) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      // 1. Assign doctor to this branch
      const existingBranchIds = allDoctorBranches
        .filter((db) => db.teamMemberId === selectedClinician.id && db.isActive)
        .map((db) => db.clinicId);
      const newBranchIds = Array.from(new Set([...existingBranchIds, branchId]));

      const updatedBranches = await setDoctorBranches(
        { teamMemberId: selectedClinician.id, clinicIds: newBranchIds },
        accessToken
      );
      setAllDoctorBranches((prev) => [
        ...prev.filter((db) => db.teamMemberId !== selectedClinician.id),
        ...updatedBranches.filter((db) => db.isActive),
      ]);

      // 2. Select this branch for services and load offered services
      setSelectedBranchForServices(branchId);
      const srvs = await adminGetLocationServices(branchId, accessToken);
      const offered = srvs.filter((s) => s.isOffered);
      setBranchOfferedServices(offered);

      // 3. Populate Smart Defaults for this branch
      const roleKey = selectedClinician.role || "General Dentist";
      const targetTitles = ROLE_SERVICE_TITLES[roleKey] || ROLE_SERVICE_TITLES["General Dentist"] || [];

      const matchingOffered = offered.filter((s) =>
        targetTitles.some((t) => t.toLowerCase() === s.title.toLowerCase())
      );
      const toAuthorize = matchingOffered.length > 0 ? matchingOffered : offered;

      for (const srv of toAuthorize) {
        await saveDoctorServiceAssignment(
          {
            teamMemberId: selectedClinician.id,
            serviceId: srv.id,
            clinicId: branchId,
            isActive: true,
          },
          accessToken
        );
      }

      // Reload assignments
      const latestAssignments = await getDoctorServices(selectedClinician.id, undefined, accessToken);
      setDoctorServiceAssignments(latestAssignments);

      const locName = locations.find((l) => l.id === branchId)?.name || "Branch";
      toast.success(`Assigned to ${locName} and populated Smart Default procedures.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign branch.");
      setErrorMessage(err?.message || "Failed to assign branch.");
    } finally {
      setIsSaving(false);
    }
  };

  // Bulk de-authorize all services at the active branch
  const handleDeauthorizeAllBranchServices = async () => {
    if (!selectedClinician || !selectedBranchForServices || !accessToken) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const assignmentsToDelete = doctorServiceAssignments.filter(
        (a) => a.clinicId === selectedBranchForServices
      );
      await Promise.all(
        assignmentsToDelete.map((a) => deleteDoctorServiceAssignment(a.id, accessToken))
      );
      setDoctorServiceAssignments((prev) =>
        prev.filter((a) => a.clinicId !== selectedBranchForServices)
      );
      setSuccessMessage("All authorizations removed for this branch.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to remove authorizations.");
    } finally {
      setIsSaving(false);
    }
  };

  // Tab 4: Add & Delete Shifts
  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClinician || !accessToken) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const res = await adminSaveProviderAvailability(
        {
          teamMemberId: selectedClinician.id,
          dayOfWeek: Number(newShift.dayOfWeek),
          startTime: newShift.startTime,
          endTime: newShift.endTime,
          breakStartTime: newShift.breakStartTime || null,
          breakEndTime: newShift.breakEndTime || null,
          clinicId: newShift.clinicId || null,
          isActive: true,
        },
        accessToken
      );
      setShifts((prev) => [...prev, res.availability]);
      setSuccessMessage("Weekly recurring shift added successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to add shift.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!accessToken) return;
    setIsSaving(true);
    try {
      await adminDeleteProviderAvailability(shiftId, accessToken);
      setShifts((prev) => prev.filter((s) => s.id !== shiftId));
      setSuccessMessage("Shift removed.");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete shift.");
    } finally {
      setIsSaving(false);
    }
  };

  // Tab 5: Overrides
  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClinician || !accessToken || !newOverride.overrideDate) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const added = await saveDoctorOverride(
        {
          teamMemberId: selectedClinician.id,
          overrideDate: newOverride.overrideDate,
          overrideType: newOverride.overrideType,
          clinicId: newOverride.clinicId || null,
          reason: newOverride.reason || null,
        },
        accessToken
      );
      setOverrides((prev) => [...prev, added]);
      setNewOverride({ overrideDate: "", overrideType: "unavailable", reason: "", clinicId: "" });
      setSuccessMessage("Date override recorded.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to record override.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOverride = async (overrideId: string) => {
    if (!accessToken) return;
    setIsSaving(true);
    try {
      await deleteDoctorOverride(overrideId, accessToken);
      setOverrides((prev) => prev.filter((o) => o.id !== overrideId));
      setSuccessMessage("Override removed.");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete override.");
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered & Sorted Team Members (with multi-branch awareness)
  const filteredTeam = useMemo(() => {
    // Build set of doctor IDs matching the locationFilter
    let clinicianIdsAtLocation: Set<string> | null = null;
    if (locationFilter !== "all") {
      clinicianIdsAtLocation = new Set();
      // Check primary branch
      teamMembers.forEach((m) => {
        if (m.locationId === locationFilter) {
          clinicianIdsAtLocation!.add(m.id);
        }
      });
      // Check multi-branch assignments from doctor_clinic_assignments
      allDoctorBranches.forEach((db) => {
        if (db.clinicId === locationFilter && db.isActive) {
          clinicianIdsAtLocation!.add(db.teamMemberId);
        }
      });
    }

    const filtered = teamMembers.filter((m) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.specialties && m.specialties.join(" ").toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.professionalTitle && m.professionalTitle.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRole = roleFilter === "all" || m.role === roleFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && m.isActive) ||
        (statusFilter === "inactive" && !m.isActive);

      const matchesLocation =
        locationFilter === "all" ||
        (clinicianIdsAtLocation !== null && clinicianIdsAtLocation.has(m.id));

      return matchesSearch && matchesRole && matchesStatus && matchesLocation;
    });

    // Apply Sorting
    return filtered.slice().sort((a, b) => {
      if (sortBy === "name") {
        return a.displayName.localeCompare(b.displayName);
      }
      if (sortBy === "location") {
        const getLocName = (m: TeamMember) => {
          if (m.locationId) {
            const loc = locations.find((l) => l.id === m.locationId);
            if (loc) return loc.name;
          }
          const assign = allDoctorBranches.find((db) => db.teamMemberId === m.id);
          if (assign) {
            const loc = locations.find((l) => l.id === assign.clinicId);
            if (loc) return loc.name;
          }
          return "ZZZ - Unassigned";
        };
        return getLocName(a).localeCompare(getLocName(b));
      }
      return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    });
  }, [teamMembers, searchQuery, roleFilter, statusFilter, locationFilter, sortBy, allDoctorBranches, locations]);

  const paginatedTeam = useMemo(() => {
    const start = (teamPage - 1) * teamPageSize;
    return filteredTeam.slice(start, start + teamPageSize);
  }, [filteredTeam, teamPage, teamPageSize]);

  return (
    <AnimatedPage className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              Team Management
            </span>
            <span className="text-xs text-muted-foreground">WHO performs care</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Clinicians & Staff</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Manage doctor profiles, assigned branches, authorized clinical procedures, and weekly shift schedules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadInitialData} disabled={isLoading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setCreateModalOpen(true)} className="gap-2 shadow-sm font-semibold">
            <UserPlus className="w-4 h-4" />
            Add Clinician
          </Button>
        </div>
      </div>

      {/* Decoupled Information Architecture Callout - Soft & Airy */}
      <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-gradient-to-r from-emerald-50/70 via-teal-50/30 to-slate-50/60 dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-slate-900 p-5 shadow-xs transition-all">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Clinician Ownership in Information Architecture</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                • <strong>Team Management</strong> defines WHO provides care, multi-branch assignments, and authorized procedures with duration overrides.<br />
                • To modify baseline fees, procedure titles, or standard durations, visit{" "}
                <Link href="/admin/services" className="text-emerald-700 dark:text-emerald-400 hover:underline font-medium">
                  Services Catalog
                </Link>.<br />
                • To manage physical branches and branch-wide operating hours, visit{" "}
                <Link href="/admin/locations" className="text-emerald-700 dark:text-emerald-400 hover:underline font-medium">
                  Locations
                </Link>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            <Link href="/admin/services">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900 shadow-xs hover:bg-slate-50">
                <Layers className="w-3.5 h-3.5" />
                Services Catalog
              </Button>
            </Link>
            <Link href="/admin/locations">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900 shadow-xs hover:bg-slate-50">
                <Building2 className="w-3.5 h-3.5" />
                Locations
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <SuccessAlert message={successMessage} onClose={() => setSuccessMessage(null)} />
      )}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-300 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* IF NO CLINICIAN SELECTED: SHOW TEAM LIST */}
      <AnimatePresence mode="wait">
        {!selectedClinician ? (
          <motion.div
            key="team-list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "-20%" }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="space-y-6"
          >
          {/* Search & Filter Bar with Location Search & Sorting */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search clinicians by name, specialization..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Status:</span>
                <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`px-3 py-1.5 rounded-md font-medium transition-all ${statusFilter === "all" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    All ({teamMembers.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter("active")}
                    className={`px-3 py-1.5 rounded-md font-medium transition-all ${statusFilter === "active" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Active ({teamMembers.filter((m) => m.isActive).length})
                  </button>
                  <button
                    onClick={() => setStatusFilter("inactive")}
                    className={`px-3 py-1.5 rounded-md font-medium transition-all ${statusFilter === "inactive" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Inactive ({teamMembers.filter((m) => !m.isActive).length})
                  </button>
                </div>
              </div>
            </div>

            {/* Sub-bar: Location Filter & Sorting Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>Filter by Branch:</span>
                </div>

                <div className="relative">
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="h-8 pl-3 pr-8 rounded-lg border border-border bg-background text-foreground text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    <option value="all">All Locations (Practice-wide)</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.city})
                      </option>
                    ))}
                  </select>
                </div>

                {locationFilter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setLocationFilter("all")}
                    className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" /> Clear Location Filter
                  </button>
                )}
              </div>

              {/* Sort By Selector */}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="default">Default Order</option>
                  <option value="name">Name (A–Z)</option>
                  <option value="location">Assigned Branch / Location</option>
                </select>
              </div>
            </div>
          </div>

          {/* Clinicians Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-6 rounded-2xl border border-border/60 bg-card space-y-4 shadow-xs">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-14 h-14 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                  <div className="pt-2 flex justify-between items-center border-t border-border/30">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-8 w-24 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTeam.length === 0 ? (
            <Card className="p-12 text-center border-dashed space-y-4">
              <div className="w-12 h-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">No clinicians found</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== "all"
                    ? "No team members match your current filters."
                    : "No clinicians configured yet. Click below to add your first team member."}
                </p>
              </div>
              <Button onClick={() => setCreateModalOpen(true)} size="sm" className="gap-2">
                <UserPlus className="w-4 h-4" /> Add Clinician
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedTeam.map((member) => (
                  <Card
                    key={member.id}
                    onClick={() => setSelectedEntityModal({ type: "clinician", id: member.id, data: member })}
                    className={`overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800/60 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between cursor-pointer group/card ${!member.isActive ? "opacity-60 bg-slate-50/50 dark:bg-slate-900/40" : ""
                      }`}
                  >
                    <div className="p-5 space-y-4">
                      {/* Top Row: Avatar & Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-border shrink-0 bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                            {member.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={resolveMediaUrl(member.photoUrl) || undefined}
                                alt={member.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              member.displayName.charAt(0)
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-foreground line-clamp-1">
                              {member.displayName}
                            </h3>
                            <span className="text-xs font-semibold text-primary">
                              {member.specialties?.join(", ") || member.professionalTitle || "Dental Surgeon"}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${member.isActive
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "bg-slate-700/10 text-slate-700 dark:text-slate-400"
                            }`}
                        >
                          {member.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      {/* Meta info */}
                      <div className="space-y-1.5 pt-2 border-t border-border/40 text-xs text-muted-foreground">
                        {member.credentials && (
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="line-clamp-1">{member.credentials}</span>
                          </div>
                        )}
                        {member.professionalTitle && (
                          <div className="flex items-center gap-2">
                            <Stethoscope className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="line-clamp-1">{member.professionalTitle}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div onClick={(e) => e.stopPropagation()} className="p-4 border-t border-border/40 bg-muted/10 flex items-center justify-between gap-2">
                      <button
                        onClick={async () => {
                          if (!accessToken) return;
                          await adminToggleTeamMemberStatus(member.id, !member.isActive, accessToken);
                          setSuccessMessage(`Clinician status updated.`);
                          setTimeout(() => setSuccessMessage(null), 2500);
                          loadInitialData();
                        }}
                        className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${member.isActive
                            ? "text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                            : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                          }`}
                      >
                        {member.isActive ? "Deactivate" : "Activate"}
                      </button>

                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedClinician(member);
                          setActiveTab("profile");
                        }}
                        className="gap-1.5 text-xs font-semibold"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Manage Clinician
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Scalable Server/Client Pagination Component */}
              <Pagination
                currentPage={teamPage}
                totalItems={filteredTeam.length}
                pageSize={teamPageSize}
                onPageChange={setTeamPage}
                onPageSizeChange={setTeamPageSize}
                pageSizeOptions={[6, 12, 24]}
                itemName="Clinicians"
                className="pt-2"
              />
            </div>
          )}
        </motion.div>
      ) : (
        /* DEDICATED 5-TAB CLINICIAN MANAGEMENT VIEW WITH DRILL-IN ANIMATION */
        <motion.div
          key={`clinician-${selectedClinician.id}`}
          initial={{ opacity: 0, x: "100%" }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: "100%" }}
          transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
          className="space-y-6"
        >
          {/* Top Breadcrumb */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedClinician(null)}
              className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Back to All Clinicians
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Currently configuring:</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground">
                {selectedClinician.displayName}
              </span>
            </div>
          </div>

          {/* Tab Navigation Pill Bar */}
          <div className="flex items-center gap-1.5 border-b border-border/50 pb-2 overflow-x-auto bg-muted/20 p-1.5 rounded-xl">
            <button
              onClick={() => setActiveTab("profile")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${activeTab === "profile"
                  ? "bg-primary !text-white font-semibold shadow-xs ring-1 ring-primary/40"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              <Users className="w-3.5 h-3.5" />
              1. Profile & Bio
            </button>
            <button
              onClick={() => setActiveTab("locations")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${activeTab === "locations"
                  ? "bg-primary !text-white font-semibold shadow-xs ring-1 ring-primary/40"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              2. Assigned Locations ({selectedClinicIds.length})
            </button>
            <button
              onClick={() => setActiveTab("services")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${activeTab === "services"
                  ? "bg-primary !text-white font-semibold shadow-xs ring-1 ring-primary/40"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              3. Authorized Services & Custom Durations
            </button>
            <button
              onClick={() => setActiveTab("schedule")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${activeTab === "schedule"
                  ? "bg-primary !text-white font-semibold shadow-xs ring-1 ring-primary/40"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              <Clock className="w-3.5 h-3.5" />
              4. Weekly Shifts ({shifts.length})
            </button>
            <button
              onClick={() => setActiveTab("availability")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${activeTab === "availability"
                  ? "bg-primary !text-white font-semibold shadow-xs ring-1 ring-primary/40"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              5. Leaves & Overrides ({overrides.length})
            </button>
          </div>

          {/* Tab Content Wrapped in AnimatePresence with Soft Fade & Vertical Slide */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {/* TAB 1: PROFILE */}
              {activeTab === "profile" && (
                <Card className="p-6">
                  <form noValidate onSubmit={handleSaveProfile} className="space-y-6 max-w-3xl">
                    <div>
                      <h3 className="text-base font-bold text-foreground">Clinician Profile & Credentials</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Professional titles, contact info, qualifications, and public doctor biography.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-foreground mb-1 block">Full Display Name *</label>
                        <input
                          type="text"
                          required
                          value={profileForm.displayName}
                          onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">Professional Title</label>
                        <input
                          type="text"
                          value={profileForm.professionalTitle}
                          onChange={(e) => setProfileForm({ ...profileForm, professionalTitle: e.target.value })}
                          placeholder="e.g. Associate Dental Surgeon, Consultant"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">Specialties (comma-separated)</label>
                        <input
                          type="text"
                          value={profileForm.specialties}
                          onChange={(e) => setProfileForm({ ...profileForm, specialties: e.target.value })}
                          placeholder="e.g. Orthodontics, Restorative, Implants"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-foreground mb-1 block">Degrees & Qualifications</label>
                        <input
                          type="text"
                          value={profileForm.credentials}
                          onChange={(e) => setProfileForm({ ...profileForm, credentials: e.target.value })}
                          placeholder="e.g. BDS (Pak), FCPS Orthodontics (CPSP), MOrth RCS (Edin)"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-foreground mb-1 block">Clinical Biography</label>
                        <textarea
                          rows={4}
                          value={profileForm.biography}
                          onChange={(e) => setProfileForm({ ...profileForm, biography: e.target.value })}
                          placeholder="Dr. Hira has over 12 years of specialized clinical experience..."
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-foreground mb-1 block">Profile Photograph</label>
                        <div className="flex items-center gap-4">
                          {profileForm.photoUrl && (
                            <div className="relative w-20 h-20 rounded-full overflow-hidden border border-border shrink-0 bg-muted">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={resolveMediaUrl(profileForm.photoUrl) || undefined}
                                alt="Doctor"
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => setProfileForm({ ...profileForm, photoUrl: "" })}
                                className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5 hover:bg-black"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          <div className="flex-1 space-y-2">
                            <label className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg text-xs font-medium text-muted-foreground hover:border-primary hover:text-foreground cursor-pointer transition-colors">
                              <Upload className="w-3.5 h-3.5" />
                              {isUploadingPhoto ? "Uploading..." : "Upload Profile Photo (max 20MB)"}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleUploadPhoto}
                                disabled={isUploadingPhoto}
                                className="hidden"
                              />
                            </label>
                            <input
                              type="text"
                              value={profileForm.photoUrl}
                              onChange={(e) => setProfileForm({ ...profileForm, photoUrl: e.target.value })}
                              placeholder="Or paste direct image URL (https://...)"
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border flex justify-end">
                      <Button type="submit" disabled={isSaving} className="gap-2 font-semibold">
                        {isSaving ? "Saving..." : "Save Profile Details"}
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* TAB 2: ASSIGNED LOCATIONS */}
              {activeTab === "locations" && (
                <Card className="p-6 space-y-6 max-w-3xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-foreground">Clinic Branch Assignments</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Assign this doctor to one or multiple physical clinic branches where they can take appointments.
                      </p>
                    </div>
                    <Button onClick={handleSaveBranches} disabled={isSaving} className="gap-2 font-semibold">
                      <Check className="w-4 h-4" />
                      {isSaving ? "Saving..." : "Save Branch Assignments"}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {locations.map((loc) => {
                      const isAssigned = selectedClinicIds.includes(loc.id);
                      const authCount = doctorServiceAssignments.filter(
                        (a) => a.clinicId === loc.id && a.isActive
                      ).length;
                      return (
                        <div
                          key={loc.id}
                          onClick={() => handleToggleClinicBranch(loc.id)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                            isAssigned
                              ? "bg-primary/5 border-primary/40 shadow-xs"
                              : "bg-card border-border hover:bg-muted/20"
                          }`}
                        >
                          <div>
                            <div className="font-bold text-sm text-foreground">{loc.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {loc.addressLine1}, {loc.city}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              {loc.isPrimary && (
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                  Primary HQ
                                </span>
                              )}
                              {isAssigned ? (
                                <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                  ✓ Assigned • {authCount} procedure{authCount === 1 ? "" : "s"} authorized
                                </span>
                              ) : authCount > 0 ? (
                                <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                                  ⚠️ Not assigned (has {authCount} prior authorizations)
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => { }}
                            className="w-4 h-4 rounded text-primary focus:ring-primary mt-1"
                          />
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* TAB 3: SERVICES & CUSTOM DURATIONS (CORE ADMIN REQUIREMENT) */}
              {activeTab === "services" && (
                <Card className="p-6 space-y-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                          Tier 4 Hierarchy
                        </span>
                        <h3 className="text-base font-bold text-foreground">
                          Branch-Based Doctor Service Authorization
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Configure which procedures <strong>{selectedClinician.displayName}</strong> is authorized to perform at each assigned physical branch.
                      </p>
                    </div>

                    {/* Quick Link to Tab 2 */}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab("locations")}
                        className="text-xs gap-1.5"
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        Manage Assigned Branches ({selectedClinicIds.length})
                      </Button>
                    </div>
                  </div>

                  {selectedClinicIds.length === 0 ? (
                    /* EMPTY STATE: Quick Branch Selector with Smart Defaults Auto-population */
                    <div className="py-10 px-6 text-center border-2 border-dashed border-border rounded-2xl p-8 space-y-4 bg-muted/5 max-w-xl mx-auto">
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-foreground">Configure Branch Services & Smart Defaults</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          This clinician does not have an active physical branch assigned yet. Select a branch below to immediately assign them and populate smart default procedures.
                        </p>
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <select
                          disabled={isSaving}
                          onChange={(e) => {
                            if (e.target.value) handleQuickAssignBranch(e.target.value);
                          }}
                          defaultValue=""
                          className="w-full sm:w-72 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-border bg-card text-foreground font-medium outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-xs"
                        >
                          <option value="" disabled>Select a branch to configure services...</option>
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name} {loc.city ? `(${loc.city})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                        <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>Smart defaults will automatically authorize procedures matching &ldquo;{selectedClinician.role}&rdquo; at the selected branch.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* ASSIGNED BRANCH SELECTION PILLS */}
                      <div>
                        <label className="text-xs font-bold text-foreground block mb-2">
                          1. Select Assigned Branch:
                        </label>
                        <div className="flex flex-wrap gap-2.5">
                          {locations
                            .filter((loc) => selectedClinicIds.includes(loc.id))
                            .map((loc) => {
                              const isSelected = selectedBranchForServices === loc.id;
                              const branchAuthCount = doctorServiceAssignments.filter(
                                (a) => a.clinicId === loc.id && a.isActive
                              ).length;
                              return (
                                <button
                                  key={loc.id}
                                  type="button"
                                  onClick={() => handleBranchSelectForServices(loc.id)}
                                  className={`px-4 py-2.5 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                                    isSelected
                                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/40"
                                      : "border-border bg-card text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                                  }`}
                                >
                                  <MapPin className="w-4 h-4 shrink-0 text-primary" />
                                  <div>
                                    <div className="text-xs font-bold">{loc.name}</div>
                                    <div className="text-[10px] opacity-80">
                                      {branchAuthCount} procedure{branchAuthCount === 1 ? "" : "s"} authorized
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      </div>

                      {/* BRANCH PROCEDURES & ACTIONS */}
                      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
                          <div>
                            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                              <span>Procedures Offered at {locations.find((l) => l.id === selectedBranchForServices)?.name || "Selected Branch"}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {branchOfferedServices.length} offered in branch catalog
                              </span>
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Check procedures this clinician is certified to perform at this physical location.
                            </p>
                          </div>

                          {/* Bulk Actions */}
                          {branchOfferedServices.length > 0 && (
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAuthorizeAllBranchServices}
                                disabled={isSaving}
                                className="text-xs h-7 font-semibold"
                              >
                                Authorize All ({branchOfferedServices.length})
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleDeauthorizeAllBranchServices}
                                disabled={isSaving}
                                className="text-xs h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              >
                                De-authorize All
                              </Button>
                            </div>
                          )}
                        </div>

                        {branchOfferedServices.length === 0 ? (
                          <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl p-6 space-y-2">
                            <p className="font-semibold text-foreground">No procedures configured for this branch yet</p>
                            <p>Configure which services this location offers in Locations → Services Catalog.</p>
                            <Link href="/admin/locations">
                              <Button variant="outline" size="sm" className="mt-2 text-xs">
                                Go to Locations Catalog
                              </Button>
                            </Link>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {branchOfferedServices.map((srv) => {
                              const exactAssignment = doctorServiceAssignments.find(
                                (a) => a.serviceId === srv.id && a.clinicId === selectedBranchForServices
                              );
                              const fallbackAssignment = doctorServiceAssignments.find(
                                (a) => a.serviceId === srv.id && a.clinicId === null
                              );
                              const assignment = exactAssignment || fallbackAssignment;
                              const isAuthorized = assignment ? assignment.isActive : false;

                              return (
                                <div
                                  key={srv.id}
                                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                                    isAuthorized
                                      ? "bg-primary/5 border-primary/30 shadow-xs"
                                      : "bg-muted/10 border-border opacity-70"
                                  }`}
                                >
                                  {/* Procedure Info */}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-sm text-foreground">{srv.title}</span>
                                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                        {srv.category}
                                      </span>
                                      {isAuthorized && (
                                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                                          Authorized at this branch
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Catalog Duration: <strong>{srv.duration || "45m"}</strong> • Fee: {srv.cashPrice || "Standard"}
                                    </div>
                                  </div>

                                  {/* Authorization & Overrides */}
                                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                                    {isAuthorized && (
                                      <>
                                        <div className="flex items-center gap-1.5 text-xs">
                                          <span className="text-muted-foreground font-medium">Duration:</span>
                                          <input
                                            type="number"
                                            min={5}
                                            max={240}
                                            step={5}
                                            placeholder={srv.duration?.replace(/[^0-9]/g, "") || "45"}
                                            value={
                                              customDurations[srv.id] !== undefined
                                                ? customDurations[srv.id]
                                                : (assignment?.customDurationMinutes ?? "")
                                            }
                                            onChange={(e) =>
                                              setCustomDurations({
                                                ...customDurations,
                                                [srv.id]: e.target.value === "" ? ("" as any) : Number(e.target.value),
                                              })
                                            }
                                            className="w-16 px-2 py-1 text-xs rounded-md border border-border bg-background outline-none font-mono text-center"
                                          />
                                          <span className="text-muted-foreground">m</span>
                                        </div>

                                        <div className="flex items-center gap-1.5 text-xs">
                                          <span className="text-muted-foreground font-medium">Buffer:</span>
                                          <input
                                            type="number"
                                            min={0}
                                            max={60}
                                            step={5}
                                            placeholder={String((srv as any).bufferMinutes ?? 10)}
                                            value={
                                              customBuffers[srv.id] !== undefined
                                                ? customBuffers[srv.id]
                                                : (assignment?.bufferMinutes ?? "")
                                            }
                                            onChange={(e) =>
                                              setCustomBuffers({
                                                ...customBuffers,
                                                [srv.id]: e.target.value === "" ? ("" as any) : Number(e.target.value),
                                              })
                                            }
                                            className="w-16 px-2 py-1 text-xs rounded-md border border-border bg-background outline-none font-mono text-center"
                                          />
                                          <span className="text-muted-foreground">m</span>
                                        </div>

                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleSaveDurationOverride(srv.id, assignment)}
                                          disabled={isSaving}
                                          className="h-7 text-xs font-semibold"
                                        >
                                          Save
                                        </Button>

                                        {assignment?.customDurationMinutes !== null && assignment?.customDurationMinutes !== undefined && (
                                          <button
                                            type="button"
                                            onClick={() => handleClearDurationOverride(srv.id, assignment)}
                                            disabled={isSaving}
                                            className="text-[11px] text-muted-foreground hover:text-rose-600 underline cursor-pointer"
                                            title="Reset to branch catalog defaults"
                                          >
                                            Reset
                                          </button>
                                        )}
                                      </>
                                    )}

                                    <Button
                                      size="sm"
                                      variant={isAuthorized ? "primary" : "outline"}
                                      onClick={() => handleToggleServiceAuth(srv.id, exactAssignment || fallbackAssignment)}
                                      disabled={isSaving}
                                      className="h-8 text-xs font-semibold gap-1.5"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      {isAuthorized ? "Authorized" : "Authorize"}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* TAB 4: WEEKLY SHIFTS */}
              {activeTab === "schedule" && (
                <Card className="p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-foreground">Weekly Recurring Shifts</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Define recurring shifts, working hours, and lunch breaks per branch for this doctor.
                      </p>
                    </div>
                  </div>

                  {/* Add New Shift Form */}
                  <form noValidate onSubmit={handleAddShift} className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-primary">Add Weekly Working Shift</div>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Day</label>
                        <select
                          value={newShift.dayOfWeek}
                          onChange={(e) => setNewShift({ ...newShift, dayOfWeek: Number(e.target.value) })}
                          className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-background outline-none"
                        >
                          {DAY_NAMES.map((name, idx) => (
                            <option key={idx} value={idx}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Shift Start</label>
                        <input
                          type="time"
                          required
                          value={newShift.startTime}
                          onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-background outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Shift End</label>
                        <input
                          type="time"
                          required
                          value={newShift.endTime}
                          onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-background outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Break Start</label>
                        <input
                          type="time"
                          value={newShift.breakStartTime}
                          onChange={(e) => setNewShift({ ...newShift, breakStartTime: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-background outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Break End</label>
                        <input
                          type="time"
                          value={newShift.breakEndTime}
                          onChange={(e) => setNewShift({ ...newShift, breakEndTime: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-background outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Branch</label>
                        <select
                          value={newShift.clinicId}
                          onChange={(e) => setNewShift({ ...newShift, clinicId: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-background outline-none"
                        >
                          <option value="">Any / HQ</option>
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button type="submit" disabled={isSaving} size="sm" className="gap-1.5 text-xs font-semibold">
                        <Plus className="w-3.5 h-3.5" /> Add Shift
                      </Button>
                    </div>
                  </form>

                  {/* Shifts List */}
                  {shifts.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                      No weekly shifts configured yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {shifts.map((s) => (
                        <div
                          key={s.id}
                          className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-4">
                            <span className="font-bold uppercase tracking-wider text-foreground w-28">
                              {s.dayName || DAY_NAMES[s.dayOfWeek]}
                            </span>
                            <span className="font-mono font-semibold text-foreground">
                              {s.startTime} - {s.endTime}
                            </span>
                            {s.breakStartTime && (
                              <span className="text-muted-foreground">
                                (Break: {s.breakStartTime} - {s.breakEndTime})
                              </span>
                            )}
                            {s.clinicId && (
                              <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-semibold">
                                {locations.find((l) => l.id === s.clinicId)?.name || "Branch"}
                              </span>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteShift(s.id)}
                            disabled={isSaving}
                            className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {/* TAB 5: LEAVES & OVERRIDES */}
              {activeTab === "availability" && (
                <Card className="p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-foreground">Date-Specific Leaves & Shift Overrides</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Record planned vacations, emergency time-off, or additional working dates for this doctor.
                      </p>
                    </div>
                  </div>

                  {/* Add Override Form */}
                  <form noValidate onSubmit={handleAddOverride} className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-primary">Record Date Override</div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Date *</label>
                        <input
                          type="date"
                          required
                          value={newOverride.overrideDate}
                          onChange={(e) => setNewOverride({ ...newOverride, overrideDate: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-background outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Override Type *</label>
                        <select
                          value={newOverride.overrideType}
                          onChange={(e) =>
                            setNewOverride({
                              ...newOverride,
                              overrideType: e.target.value as "unavailable" | "working" | "modified",
                            })
                          }
                          className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-background outline-none"
                        >
                          <option value="unavailable">Unavailable (Leave / Off)</option>
                          <option value="working">Working (Extra Shift)</option>
                          <option value="modified">Modified Hours</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Reason / Note</label>
                        <input
                          type="text"
                          placeholder="e.g. Annual dental conference, Personal leave"
                          value={newOverride.reason}
                          onChange={(e) => setNewOverride({ ...newOverride, reason: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-background outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button type="submit" disabled={isSaving} size="sm" className="gap-1.5 text-xs font-semibold">
                        <Plus className="w-3.5 h-3.5" /> Record Override
                      </Button>
                    </div>
                  </form>

                  {/* Overrides List */}
                  {overrides.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                      No date overrides currently recorded.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {overrides.map((ov) => (
                        <div
                          key={ov.id}
                          className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-foreground">{ov.overrideDate}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] ${ov.overrideType === "unavailable"
                                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                }`}
                            >
                              {ov.overrideType}
                            </span>
                            {ov.reason && <span className="text-muted-foreground">— {ov.reason}</span>}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOverride(ov.id)}
                            disabled={isSaving}
                            className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>

      {/* OVERHAULED ADD TEAM MEMBER MODAL */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateModalOpen(false);
          }}
        >
          <div className="w-full max-w-2xl bg-background border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-border/40 flex items-center justify-between shrink-0 bg-muted/10">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Team Management</span>
                <h2 className="text-lg font-bold text-foreground">Add Team Member</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Register clinical practitioners, care assistants, or administrative personnel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              noValidate
              onSubmit={async (e) => {
                e.preventDefault();
                // Custom React Validation (No ugly native bubbles)
                if (!createForm.displayName.trim()) {
                  toast.error("Full Name is required.");
                  return;
                }
                if (!createForm.locationId) {
                  toast.error("Primary Branch is required.");
                  return;
                }
                const isMedical = createForm.role === "doctor" || createForm.role === "nurse";
                if (isMedical && (!createForm.specialties || createForm.specialties.length === 0)) {
                  toast.error("Clinical Specialty is required.");
                  return;
                }
                if (!createForm.professionalTitle.trim()) {
                  toast.error("Professional Title is required.");
                  return;
                }

                setIsSaving(true);
                setErrorMessage(null);

                const names = createForm.displayName.trim().split(" ");
                const firstName = names[0] || "Staff";
                const lastName = names.slice(1).join(" ") || "Member";
                const specialtiesToSend = isMedical ? createForm.specialties : [];

                try {
                  const created = await adminCreateTeamMember(
                    {
                      firstName,
                      lastName,
                      displayName: createForm.displayName.trim(),
                      professionalTitle: createForm.professionalTitle.trim() || (isMedical ? "Associate Dental Surgeon" : "Team Member"),
                      role: createForm.role || "doctor",
                      specialties: specialtiesToSend,
                      credentials: isMedical ? (createForm.credentials.trim() || null) : null,
                      education: isMedical ? (createForm.education.trim() || null) : null,
                      biography: createForm.biography.trim() || null,
                      locationId: createForm.locationId || null,
                      photoUrl: createForm.photoUrl.trim() || null,
                      isActive: true,
                    },
                    accessToken || undefined
                  );
                  toast.success(`Team member "${created.displayName}" created successfully.`);
                  setCreateModalOpen(false);
                  await loadInitialData();
                  setSelectedClinician(created);
                  setActiveTab("profile");
                } catch (err: any) {
                  const errorMsg = err?.message || "Failed to create team member.";
                  setErrorMessage(errorMsg);
                  toast.error(errorMsg);
                } finally {
                  setIsSaving(false);
                }
              }}
              className="p-6 space-y-6 overflow-y-auto flex-1"
            >
              {/* TOP SECTION: CIRCULAR DASHED PHOTO UPLOAD ZONE */}
              <div className="flex flex-col items-center justify-center">
                <div
                  onClick={() => document.getElementById("create-member-photo-input")?.click()}
                  className="w-24 h-24 rounded-full border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer relative group flex flex-col items-center justify-center overflow-hidden shadow-xs"
                >
                  {createForm.photoUrl ? (
                    <>
                      <img
                        src={resolveMediaUrl(createForm.photoUrl) || undefined}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                        <Upload className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-semibold">Change</span>
                      </div>
                    </>
                  ) : isUploadingCreatePhoto ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-primary/70 group-hover:scale-110 transition-transform mb-1" />
                      <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-primary transition-colors text-center px-1">
                        Upload Photo
                      </span>
                    </>
                  )}
                </div>
                <input
                  id="create-member-photo-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsUploadingCreatePhoto(true);
                    try {
                      const res = await adminUploadMedia(file, accessToken || undefined);
                      setCreateForm((prev) => ({ ...prev, photoUrl: res.url }));
                    } catch (err: any) {
                      setErrorMessage(err.message || "Failed to upload photo.");
                    } finally {
                      setIsUploadingCreatePhoto(false);
                    }
                  }}
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Click to upload portrait (PNG, JPG or WebP)
                </p>
              </div>

              {/* HORIZONTAL SOFT PILL BUTTONS FOR ROLE SELECTION */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Role Classification *
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { id: "doctor", label: "Doctor", icon: Stethoscope },
                    { id: "nurse", label: "Nurse", icon: UserCheck },
                    { id: "pharmacist", label: "Pharmacist", icon: Building2 },
                    { id: "cleaner", label: "Cleaner", icon: Sparkles },
                    { id: "admin", label: "Admin", icon: ShieldCheck },
                  ].map((r) => {
                    const isSelected = createForm.role === r.id;
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          let defaultTitle = createForm.professionalTitle;
                          if (r.id === "doctor") defaultTitle = "Associate Dental Surgeon";
                          else if (r.id === "nurse") defaultTitle = "Clinical Dental Assistant";
                          else if (r.id === "pharmacist") defaultTitle = "Clinical Pharmacist";
                          else if (r.id === "cleaner") defaultTitle = "Sanitation & Sterilization Specialist";
                          else if (r.id === "admin") defaultTitle = "Practice Administrative Officer";

                          setCreateForm({
                            ...createForm,
                            role: r.id,
                            professionalTitle: defaultTitle,
                          });
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${isSelected
                            ? "bg-primary !text-white shadow-xs ring-1 ring-primary/40 font-bold"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DYNAMIC FIELD RENDERING */}
              {createForm.role === "doctor" || createForm.role === "nurse" ? (
                /* TWO-COLUMN GRID FOR MEDICAL ROLES */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-border/40">
                  {/* COLUMN 1: Basic Identity */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                      1. Identity & Assignment
                    </h4>
                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={createForm.displayName}
                        onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
                        placeholder="e.g. Dr. Hira Babar"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">
                        Professional Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={createForm.professionalTitle}
                        onChange={(e) => setCreateForm({ ...createForm, professionalTitle: e.target.value })}
                        placeholder="e.g. Associate Dental Surgeon"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">
                        Primary Branch {createForm.role === "doctor" && <span className="text-rose-500">*</span>}
                      </label>
                      <select
                        required={createForm.role === "doctor"}
                        value={createForm.locationId}
                        onChange={(e) => setCreateForm({ ...createForm, locationId: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Select primary branch...</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* COLUMN 2: Professional Background */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                      2. Clinical Background
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">
                          Degree / Credentials
                        </label>
                        <input
                          type="text"
                          value={createForm.credentials}
                          onChange={(e) => setCreateForm({ ...createForm, credentials: e.target.value })}
                          placeholder="e.g. BDS, FCPS, DDS"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">
                          Alma Mater
                        </label>
                        <input
                          type="text"
                          value={createForm.education}
                          onChange={(e) => setCreateForm({ ...createForm, education: e.target.value })}
                          placeholder="e.g. King Edward, Harvard"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">
                        Clinical Specialties (Select Multiple)
                      </label>
                      <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-border/60 bg-muted/20 max-h-28 overflow-y-auto">
                        {[
                          "General Dentistry",
                          "Orthodontics",
                          "Restorative",
                          "Endodontics",
                          "Periodontics",
                          "Prosthodontics",
                          "Cosmetic Dentistry",
                          "Oral Surgery",
                          "Pediatric Dentistry",
                        ].map((spec) => {
                          const isSpecSelected = createForm.specialties.includes(spec);
                          return (
                            <button
                              key={spec}
                              type="button"
                              onClick={() => {
                                const next = isSpecSelected
                                  ? createForm.specialties.filter((s) => s !== spec)
                                  : [...createForm.specialties, spec];
                                setCreateForm({ ...createForm, specialties: next });
                              }}
                              className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all cursor-pointer ${isSpecSelected
                                  ? "bg-primary !text-white shadow-xs"
                                  : "bg-background text-foreground border border-border/80 hover:border-primary/40"
                                }`}
                            >
                              {isSpecSelected ? "✓ " : "+ "}
                              {spec}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">
                        Previous Experience & Bio
                      </label>
                      <textarea
                        rows={2}
                        value={createForm.biography}
                        onChange={(e) => setCreateForm({ ...createForm, biography: e.target.value })}
                        placeholder="Brief summary of clinical background..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* CLEAN FORM FOR NON-MEDICAL ROLES */
                <div className="space-y-4 pt-2 border-t border-border/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={createForm.displayName}
                        onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
                        placeholder="e.g. John Doe"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">
                        Designation Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={createForm.professionalTitle}
                        onChange={(e) => setCreateForm({ ...createForm, professionalTitle: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Primary Branch
                    </label>
                    <select
                      value={createForm.locationId}
                      onChange={(e) => setCreateForm({ ...createForm, locationId: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Select primary branch...</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Role Notes & Responsibilities
                    </label>
                    <textarea
                      rows={2}
                      value={createForm.biography}
                      onChange={(e) => setCreateForm({ ...createForm, biography: e.target.value })}
                      placeholder="Operational details, shift preferences or responsibilities..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-3 shrink-0">
                <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="font-semibold gap-2">
                  <UserPlus className="w-4 h-4" />
                  {isSaving ? "Creating..." : "Create Team Member"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Unified Entity Details Modal */}
      <EntityDetailsModal
        isOpen={Boolean(selectedEntityModal)}
        onClose={() => setSelectedEntityModal(null)}
        initialEntity={selectedEntityModal}
        allServices={allServices}
        allTeamMembers={teamMembers}
        allLocations={locations}
        accessToken={accessToken}
      />
    </AnimatedPage>
  );
}
