"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  ImageIcon,
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
  Stethoscope,
  Trash2,
  Upload,
  UploadCloud,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";
import { AnimatedPage } from "@/components/ui/animated-page";
import { Pagination } from "@/components/ui/pagination";
import { EntityDetailsModal, SelectedEntity } from "@/components/modals/entity-details-modal";
import { ServiceItem, adminGetServices } from "@/lib/api";
import {
  adminCreateLocation,
  adminGetLocations,
  adminGetPaginatedLocations,
  adminToggleLocationStatus,
  adminUpdateLocation,
  adminUploadMedia,
  adminGetLocationServices,
  adminUpdateLocationServices,
  adminGetWorkingHours,
  adminUpdateWorkingHours,
  adminGetBookingSettings,
  adminUpdateOnlineBookingRules,
  adminGetBookingFlowSettings,
  adminUpdateBookingFlowSettings,
  adminGetTeam,
  getDoctorBranches,
  adminGetProviderAvailabilities,
  ProviderAvailabilityItem,
  setDoctorBranches,
  resolveMediaUrl,
  LocationItem,
  LocationServiceItem,
  WorkingHoursItem,
  TeamMember,
  DoctorBranchAssignment,
} from "@/lib/api";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function AdminLocationsPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Unified Entity Details Modal state
  const [selectedEntityModal, setSelectedEntityModal] = useState<SelectedEntity | null>(null);
  const [allServices, setAllServices] = useState<ServiceItem[]>([]);
  const [allTeam, setAllTeam] = useState<TeamMember[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");



  // Selected Branch for Detailed 5-Tab Management View
  const [selectedBranch, setSelectedBranch] = useState<LocationItem | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "services" | "team" | "hours" | "booking">("overview");

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    addressLine1: "",
    addressLine2: "",
    city: "Lahore",
    state: "Punjab",
    postalCode: "54000",
    country: "Pakistan",
    phone: "",
    email: "",
    hoursInfo: "Mon-Sat: 09:00 AM - 09:00 PM",
    description: "",
    imageUrl: "",
    isPrimary: false,
    displayOrder: 0,
  });

  // Branch Images State (1 to 5 images)
  interface BranchImageItem {
    id: string;
    file: File;
    name: string;
    size: number;
    url: string;
  }
  const [branchImages, setBranchImages] = useState<BranchImageItem[]>([]);
  const [isBranchDragging, setIsBranchDragging] = useState(false);
  const branchFileInputRef = useRef<HTMLInputElement | null>(null);

  // Tab 1: Overview Form for Selected Branch
  const [overviewForm, setOverviewForm] = useState({ ...createForm });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Tab 2: Location Services
  const [locationServices, setLocationServices] = useState<LocationServiceItem[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");

  // Pagination states (Blueprint Phase 4)
  const [branchPage, setBranchPage] = useState(1);
  const [branchPageSize, setBranchPageSize] = useState(6);
  const [svcPage, setSvcPage] = useState(1);
  const [svcPageSize, setSvcPageSize] = useState(8);

  // Reset pagination on search
  useEffect(() => {
    setBranchPage(1);
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    setSvcPage(1);
  }, [serviceSearch]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (createModalOpen) setCreateModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [createModalOpen]);

  // Tab 3: Branch Doctors
  const [allTeamMembers, setAllTeamMembers] = useState<TeamMember[]>([]);
  const [assignedDoctors, setAssignedDoctors] = useState<DoctorBranchAssignment[]>([]);
  const [branchDoctorShifts, setBranchDoctorShifts] = useState<Record<string, ProviderAvailabilityItem[]>>({});
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [selectedDoctorToAssign, setSelectedDoctorToAssign] = useState<string>("");

  // Tab 4: Working Hours
  const [workingHours, setWorkingHours] = useState<WorkingHoursItem[]>([]);
  const [isLoadingHours, setIsLoadingHours] = useState(false);

  // Tab 5: Booking Settings
  const [rawFlowSettings, setRawFlowSettings] = useState<any>(null);
  const [bookingRules, setBookingRules] = useState({
    slotIntervalMinutes: 30,
    minLeadTimeHours: 2,
    advanceBookingDays: 30,
    holdMinutes: 30,
  });
  const [isLoadingBookingRules, setIsLoadingBookingRules] = useState(false);

  const loadLocations = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [data, sList, tList] = await Promise.all([
        adminGetLocations(accessToken),
        adminGetServices(accessToken).catch(() => []),
        adminGetTeam(accessToken).catch(() => []),
      ]);
      setLocations(data);
      setAllServices(sList);
      setAllTeam(tList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load locations.";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      loadLocations();
    });
  }, [accessToken]);



  const loadLocationServices = async (branchId: string) => {
    if (!accessToken) return;
    setIsLoadingServices(true);
    try {
      const services = await adminGetLocationServices(branchId, accessToken);
      setLocationServices(services);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load branch services.");
    } finally {
      setIsLoadingServices(false);
    }
  };

  const loadBranchTeam = async (branchId: string) => {
    if (!accessToken) return;
    setIsLoadingDoctors(true);
    try {
      const [team, assignments] = await Promise.all([
        adminGetTeam(accessToken).catch(() => []),
        getDoctorBranches(undefined, branchId, accessToken).catch(() => []),
      ]);
      const activeDocs = assignments.filter((a) => a.clinicId === branchId && a.isActive);
      setAllTeamMembers(team.filter((m) => m.isActive));
      setAssignedDoctors(activeDocs);

      // Fetch weekly recurring shifts for each assigned clinician at this branch
      const shiftMap: Record<string, ProviderAvailabilityItem[]> = {};
      await Promise.all(
        activeDocs.map(async (doc) => {
          try {
            const shifts = await adminGetProviderAvailabilities(doc.teamMemberId, accessToken);
            shiftMap[doc.teamMemberId] = shifts.filter((s) => s.clinicId === branchId && s.isActive);
          } catch {
            shiftMap[doc.teamMemberId] = [];
          }
        })
      );
      setBranchDoctorShifts(shiftMap);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load branch doctors.");
    } finally {
      setIsLoadingDoctors(false);
    }
  };

  const loadBranchHours = async () => {
    if (!accessToken) return;
    setIsLoadingHours(true);
    try {
      const hours = await adminGetWorkingHours(accessToken);
      // Ensure 7 days
      const mapped = Array.from({ length: 7 }, (_, dow) => {
        const found = hours.find((h) => h.dayOfWeek === dow);
        return (
          found || {
            id: `temp-${dow}`,
            dayOfWeek: dow,
            dayName: DAY_NAMES[dow],
            openTime: "09:00",
            closeTime: "17:00",
            isClosed: dow === 6,
          }
        );
      });
      setWorkingHours(mapped);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load working hours.");
    } finally {
      setIsLoadingHours(false);
    }
  };

  const loadBranchBookingRules = async () => {
    if (!accessToken) return;
    setIsLoadingBookingRules(true);
    try {
      const [settings, flow] = await Promise.all([
        adminGetBookingSettings(accessToken).catch(() => null),
        adminGetBookingFlowSettings(accessToken).catch(() => null),
      ]);
      setRawFlowSettings(flow);
      setBookingRules({
        slotIntervalMinutes: settings?.slotIntervalMinutes ?? 30,
        minLeadTimeHours: settings?.minLeadTimeHours ?? 2,
        advanceBookingDays: settings?.advanceBookingDays ?? 30,
        holdMinutes: flow?.holdMinutes ?? 30,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load booking rules.");
    } finally {
      setIsLoadingBookingRules(false);
    }
  };

  // When a branch is selected, populate Overview and load tab-specific data
  useEffect(() => {
    if (!selectedBranch) return;

    setOverviewForm({
      name: selectedBranch.name,
      addressLine1: selectedBranch.addressLine1,
      addressLine2: selectedBranch.addressLine2 || "",
      city: selectedBranch.city,
      state: selectedBranch.state,
      postalCode: selectedBranch.postalCode,
      country: selectedBranch.country || "Pakistan",
      phone: selectedBranch.phone || "",
      email: selectedBranch.email || "",
      hoursInfo: selectedBranch.hoursInfo || "",
      description: "",
      imageUrl: selectedBranch.imageUrl || "",
      isPrimary: selectedBranch.isPrimary,
      displayOrder: selectedBranch.displayOrder || 0,
    });

    if (activeTab === "services") {
      loadLocationServices(selectedBranch.id);
    } else if (activeTab === "team") {
      loadBranchTeam(selectedBranch.id);
    } else if (activeTab === "hours") {
      loadBranchHours();
    } else if (activeTab === "booking") {
      loadBranchBookingRules();
    }
  }, [selectedBranch, activeTab]);

  const handleOpenCreateModal = () => {
    setCreateForm({
      name: "",
      addressLine1: "",
      addressLine2: "",
      city: "Lahore",
      state: "Punjab",
      postalCode: "54000",
      country: "Pakistan",
      phone: "",
      email: "",
      hoursInfo: "Mon-Sat: 09:00 AM - 09:00 PM",
      description: "",
      imageUrl: "",
      isPrimary: locations.length === 0,
      displayOrder: locations.length,
    });
    setBranchImages([]);
    setCreateModalOpen(true);
  };

  const processBranchFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const validImageTypes = ["image/jpeg", "image/png", "image/webp"];

    const remainingSlots = 5 - branchImages.length;
    if (remainingSlots <= 0) {
      toast.warning("Maximum of 5 branch images reached.");
      return;
    }

    if (files.length > remainingSlots) {
      toast.warning(`Only ${remainingSlots} more image(s) can be attached (max 5 total).`);
    }

    const filesToAdd = files.slice(0, remainingSlots);
    const newItems: BranchImageItem[] = [];

    for (const file of filesToAdd) {
      if (!validImageTypes.includes(file.type)) {
        toast.error(`"${file.name}" is not a supported image format (JPG, PNG, WEBP).`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds the 5MB size limit.`);
        continue;
      }
      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
      });
    }

    if (newItems.length > 0) {
      setBranchImages((prev) => [...prev, ...newItems]);
      toast.success(`Attached ${newItems.length} image(s).`);
    }
  };

  const removeBranchImage = (id: string) => {
    setBranchImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target?.url) {
        URL.revokeObjectURL(target.url);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  const handleBranchDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsBranchDragging(true);
  };

  const handleBranchDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsBranchDragging(false);
  };

  const handleBranchDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsBranchDragging(false);
    processBranchFiles(e.dataTransfer.files);
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !createForm.name.trim() ||
      !createForm.email.trim() ||
      !createForm.phone.trim() ||
      !createForm.addressLine1.trim() ||
      !createForm.city.trim() ||
      !createForm.state.trim()
    ) {
      toast.error("Please fill in all required fields (Name, Email, Phone, Address, City, State/Province).");
      return;
    }

    setIsSaving(true);
    try {
      let finalImageUrl = createForm.imageUrl;
      if (branchImages.length > 0 && accessToken) {
        try {
          const uploadRes = await adminUploadMedia(branchImages[0].file, accessToken);
          if (uploadRes?.url) {
            finalImageUrl = uploadRes.url;
          }
        } catch (uploadErr) {
          console.warn("Media upload failed, saving branch without uploaded image URL:", uploadErr);
        }
      }

      const created = await adminCreateLocation(
        {
          name: createForm.name.trim(),
          addressLine1: createForm.addressLine1.trim(),
          addressLine2: createForm.addressLine2?.trim() || null,
          city: createForm.city.trim(),
          state: createForm.state.trim(),
          postalCode: createForm.postalCode.trim() || "54000",
          country: createForm.country || "Pakistan",
          phone: createForm.phone.trim(),
          email: createForm.email.trim(),
          hoursInfo: createForm.hoursInfo || "Mon-Sat: 09:00 AM - 09:00 PM",
          imageUrl: finalImageUrl || null,
          isPrimary: createForm.isPrimary,
          displayOrder: createForm.displayOrder,
        },
        accessToken
      );

      toast.success("Branch created successfully");
      setCreateModalOpen(false);
      await loadLocations();
      setSelectedBranch(created);
      setActiveTab("overview");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create branch.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOverview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || !accessToken) return;
    if (!overviewForm.name.trim() || !overviewForm.addressLine1.trim() || !overviewForm.city.trim()) {
      toast.error("Branch name, street address, and city are required.");
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const updated = await adminUpdateLocation(selectedBranch.id, overviewForm, accessToken);
      toast.success("Branch overview details saved successfully.");
      setSelectedBranch(updated);
      setLocations((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    } catch (err: any) {
      toast.error(err.message || "Failed to update branch overview.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File exceeds maximum allowed size of 20MB.");
      return;
    }
    setIsUploadingPhoto(true);
    setErrorMsg(null);
    try {
      const res = await adminUploadMedia(file, accessToken);
      setOverviewForm((prev) => ({ ...prev, imageUrl: res.url }));
      toast.success("Branch photo uploaded successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload photo.";
      toast.error(msg);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleToggleLocationStatus = async (id: string, currentStatus: boolean) => {
    if (!accessToken) return;
    try {
      await adminToggleLocationStatus(id, !currentStatus, accessToken);
      toast.success(`Branch ${currentStatus ? "deactivated" : "reactivated"} successfully.`);
      loadLocations();
      if (selectedBranch?.id === id) {
        setSelectedBranch((prev) => (prev ? { ...prev, isActive: !currentStatus } : null));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle branch status.");
    }
  };

  // Tab 2: Toggle service offering at this branch
  const handleToggleService = (serviceId: string) => {
    setLocationServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, isOffered: !s.isOffered } : s))
    );
  };

  const handleSaveLocationServices = async () => {
    if (!selectedBranch || !accessToken) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const enabledIds = locationServices.filter((s) => s.isOffered).map((s) => s.id);
      const updated = await adminUpdateLocationServices(selectedBranch.id, enabledIds, accessToken);
      setLocationServices(updated);
      setSuccessMsg("Branch procedure offerings updated successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update branch procedures.");
    } finally {
      setIsSaving(false);
    }
  };

  // Tab 3: Assign doctor to this branch
  const handleAssignDoctor = async () => {
    if (!selectedBranch || !selectedDoctorToAssign || !accessToken) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const existingAssignments = await getDoctorBranches(selectedDoctorToAssign, undefined, accessToken);
      const currentClinicIds = existingAssignments.map((a) => a.clinicId);
      if (!currentClinicIds.includes(selectedBranch.id)) {
        await setDoctorBranches(
          {
            teamMemberId: selectedDoctorToAssign,
            clinicIds: [...currentClinicIds, selectedBranch.id],
          },
          accessToken
        );
      }
      setSelectedDoctorToAssign("");
      setSuccessMsg("Doctor assigned to branch successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
      loadBranchTeam(selectedBranch.id);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to assign doctor.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnassignDoctor = async (teamMemberId: string) => {
    if (!selectedBranch || !accessToken) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const existingAssignments = await getDoctorBranches(teamMemberId, undefined, accessToken);
      const remainingClinicIds = existingAssignments
        .filter((a) => a.clinicId !== selectedBranch.id)
        .map((a) => a.clinicId);

      await setDoctorBranches(
        {
          teamMemberId: teamMemberId,
          clinicIds: remainingClinicIds,
        },
        accessToken
      );
      setSuccessMsg("Doctor removed from branch.");
      setTimeout(() => setSuccessMsg(null), 3000);
      loadBranchTeam(selectedBranch.id);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to remove doctor.");
    } finally {
      setIsSaving(false);
    }
  };

  // Tab 4: Save Working Hours
  const handleSaveWorkingHours = async () => {
    if (!accessToken) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const updates = workingHours.map((wh) => ({
        id: wh.id,
        clinicId: selectedBranch?.id,
        dayOfWeek: wh.dayOfWeek,
        openTime: wh.openTime || "09:00",
        closeTime: wh.closeTime || "17:00",
        isClosed: Boolean(wh.isClosed),
        is24Hours: Boolean(wh.is24Hours),
        periodsJson: wh.periodsJson || null,
      }));
      await adminUpdateWorkingHours(updates, accessToken);
      setSuccessMsg("Branch operating schedule updated successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update working hours.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSet247Hours = () => {
    setWorkingHours((prev) =>
      prev.map((wh) => ({
        ...wh,
        openTime: "00:00",
        closeTime: "23:59",
        isClosed: false,
        is24Hours: true,
      }))
    );
  };

  const handleSetStandardHours = () => {
    setWorkingHours((prev) =>
      prev.map((wh) => ({
        ...wh,
        openTime: "09:00",
        closeTime: "18:00",
        isClosed: wh.dayOfWeek === 6, // Closed Sunday
        is24Hours: false,
      }))
    );
  };

  // Tab 5: Save Booking Rules
  const handleSaveBookingRules = async () => {
    if (!accessToken) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await adminUpdateOnlineBookingRules(
        {
          slotIntervalMinutes: Number(bookingRules.slotIntervalMinutes),
          minLeadTimeHours: Number(bookingRules.minLeadTimeHours),
          advanceBookingDays: Number(bookingRules.advanceBookingDays),
        },
        accessToken
      );
      if (rawFlowSettings) {
        await adminUpdateBookingFlowSettings(
          {
            ...rawFlowSettings,
            holdMinutes: Number(bookingRules.holdMinutes),
          },
          accessToken
        );
      }
      setSuccessMsg("Branch booking rules saved successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update booking rules.");
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered branches list
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (loc.addressLine1 && loc.addressLine1.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && loc.isActive) ||
        (statusFilter === "inactive" && !loc.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [locations, searchQuery, statusFilter]);

  const paginatedLocations = useMemo(() => {
    const start = (branchPage - 1) * branchPageSize;
    return filteredLocations.slice(start, start + branchPageSize);
  }, [filteredLocations, branchPage, branchPageSize]);

  return (
    <AnimatedPage className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="flex items-start gap-3.5">
          <button
            type="button"
            onClick={() => {
              if (selectedBranch) {
                setSelectedBranch(null);
              } else {
                router.back();
              }
            }}
            className="mt-1 h-9 w-9 rounded-full border border-border/80 bg-background hover:bg-muted/60 flex items-center justify-center text-foreground/80 hover:text-foreground transition-all shadow-xs cursor-pointer shrink-0"
            title="Go Back"
            aria-label="Go Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                Location Management
              </span>
              <span className="text-xs text-muted-foreground">WHERE care is delivered</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Clinic Branches</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Configure clinic physical branches, offered services, assigned clinicians, and operational hours.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadLocations} disabled={isLoading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={handleOpenCreateModal} className="gap-2 shadow-sm font-semibold">
            <Plus className="w-4 h-4" />
            Add New Branch
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
              <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Branch Ownership in Information Architecture</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                • <strong>Locations</strong> defines WHERE care is delivered and enables which catalog services this branch provides.<br />
                • To modify baseline fees, procedure titles, or durations, visit{" "}
                <Link href="/admin/services" className="text-emerald-700 dark:text-emerald-400 hover:underline font-medium">
                  Services Catalog
                </Link>.<br />
                • To authorize doctor-specific procedures and custom durations, visit{" "}
                <Link href="/admin/team" className="text-emerald-700 dark:text-emerald-400 hover:underline font-medium">
                  Team Management
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
            <Link href="/admin/team">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900 shadow-xs hover:bg-slate-50">
                <Users className="w-3.5 h-3.5" />
                Team Management
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-300 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Drill Transition: Locations List <-> Branch Details */}
      <AnimatePresence mode="wait">
        {!selectedBranch ? (
          <motion.div
            key="branch-list-view"
            initial={{ opacity: 0, x: "-20%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "-20%" }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="space-y-6"
          >
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search branches by name, city, address..."
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

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Status:</span>
                <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`px-3 py-1.5 rounded-md font-medium transition-all ${statusFilter === "all" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    All ({locations.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter("active")}
                    className={`px-3 py-1.5 rounded-md font-medium transition-all ${statusFilter === "active" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Active ({locations.filter((l) => l.isActive).length})
                  </button>
                  <button
                    onClick={() => setStatusFilter("inactive")}
                    className={`px-3 py-1.5 rounded-md font-medium transition-all ${statusFilter === "inactive" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Inactive ({locations.filter((l) => !l.isActive).length})
                  </button>
                </div>
              </div>
            </div>

            {/* Cards Grid */}
            {isLoading ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Loading branches...</p>
              </div>
            ) : filteredLocations.length === 0 ? (
              <Card className="p-12 text-center border-dashed space-y-4">
                <div className="w-12 h-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg">No clinic branches found</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                    {searchQuery || statusFilter !== "all"
                      ? "No branches match your current search or status filters."
                      : "You haven't configured any clinic branches yet."}
                  </p>
                </div>
                <Button onClick={handleOpenCreateModal} size="sm" className="gap-2">
                  <Plus className="w-4 h-4" /> Add Branch
                </Button>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedLocations.map((loc) => (
                    <Card
                      key={loc.id}
                      onClick={() => setSelectedEntityModal({ type: "branch", id: loc.id, data: loc })}
                      className={`overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800/60 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between cursor-pointer group/card ${!loc.isActive ? "opacity-60 bg-slate-50/50 dark:bg-slate-900/40" : ""
                        }`}
                    >
                      <div>
                        {/* Image / Header Banner */}
                        <div className="h-36 bg-muted relative overflow-hidden border-b border-border/40">
                          {loc.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={resolveMediaUrl(loc.imageUrl) || undefined}
                              alt={loc.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted/60 text-muted-foreground">
                              <Building2 className="w-12 h-12 opacity-30" />
                            </div>
                          )}
                          <div className="absolute top-3 right-3 flex items-center gap-1.5">
                            {loc.isPrimary && (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground shadow-sm">
                                Primary HQ
                              </span>
                            )}
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${loc.isActive
                                  ? "bg-emerald-500/90 text-white shadow-sm"
                                  : "bg-slate-700 text-white shadow-sm"
                                }`}
                            >
                              {loc.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="p-5 space-y-3">
                          <div>
                            <h3 className="font-bold text-lg text-foreground line-clamp-1">{loc.name}</h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="line-clamp-1">{loc.addressLine1}, {loc.city}</span>
                            </p>
                          </div>

                          <div className="space-y-1.5 pt-2 border-t border-border/40 text-xs text-muted-foreground">
                            {loc.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span>{loc.phone}</span>
                              </div>
                            )}
                            {loc.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span>{loc.email}</span>
                              </div>
                            )}
                            {loc.hoursInfo && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span className="line-clamp-1">{loc.hoursInfo}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div onClick={(e) => e.stopPropagation()} className="p-4 border-t border-border/40 bg-muted/10 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleToggleLocationStatus(loc.id, loc.isActive)}
                          className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${loc.isActive
                              ? "text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                              : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                            }`}
                        >
                          {loc.isActive ? "Deactivate" : "Activate"}
                        </button>

                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedBranch(loc);
                            setActiveTab("overview");
                          }}
                          className="gap-1.5 text-xs font-semibold"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          Manage Branch
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Scalable Server/Client Pagination Component */}
                <Pagination
                  currentPage={branchPage}
                  totalItems={filteredLocations.length}
                  pageSize={branchPageSize}
                  onPageChange={setBranchPage}
                  onPageSizeChange={setBranchPageSize}
                  pageSizeOptions={[6, 12, 24]}
                  itemName="Branches"
                  className="pt-2"
                />
              </div>
            )}
          </motion.div>
        ) : (
          /* DEDICATED 5-TAB BRANCH MANAGEMENT VIEW (Sliding in from Right) */
          <motion.div
            key={`branch-details-${selectedBranch.id}`}
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="space-y-6"
          >
            {/* Top Return Breadcrumb */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedBranch(null)}
                className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="w-4 h-4" /> Back to All Branches
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Currently configuring:</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground">
                  {selectedBranch.name}
                </span>
              </div>
            </div>

            {/* Tab Navigation Pill Bar */}
            <div className="flex items-center gap-1 border-b border-border/50 pb-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${activeTab === "overview"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                1. Overview & Profile
              </button>
              <button
                onClick={() => setActiveTab("services")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${activeTab === "services"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
              >
                <Layers className="w-3.5 h-3.5" />
                2. Branch Services ({locationServices.filter((s) => s.isOffered).length || "..."})
              </button>
              <button
                onClick={() => setActiveTab("team")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${activeTab === "team"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
              >
                <Users className="w-3.5 h-3.5" />
                3. Assigned Team ({assignedDoctors.length || "..."})
              </button>
              <button
                onClick={() => setActiveTab("hours")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${activeTab === "hours"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
              >
                <Clock className="w-3.5 h-3.5" />
                4. Opening Hours
              </button>
              <button
                onClick={() => setActiveTab("booking")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${activeTab === "booking"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
              >
                <Settings className="w-3.5 h-3.5" />
                5. Booking Settings
              </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
              <Card className="p-6">
                <form onSubmit={handleSaveOverview} className="space-y-6 max-w-3xl">
                  <div>
                    <h3 className="text-base font-bold text-foreground">Facility & Contact Overview</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Physical location details, phone, email, and public facility photograph.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-foreground mb-1 block">Facility / Branch Name *</label>
                      <input
                        type="text"
                        required
                        value={overviewForm.name}
                        onChange={(e) => setOverviewForm({ ...overviewForm, name: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-foreground mb-1 block">Street Address Line 1 *</label>
                      <input
                        type="text"
                        required
                        value={overviewForm.addressLine1}
                        onChange={(e) => setOverviewForm({ ...overviewForm, addressLine1: e.target.value })}
                        placeholder="e.g. 45 Main Dental Boulevard, Phase 5 DHA"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">City *</label>
                      <input
                        type="text"
                        required
                        value={overviewForm.city}
                        onChange={(e) => setOverviewForm({ ...overviewForm, city: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">State / Province</label>
                      <input
                        type="text"
                        value={overviewForm.state}
                        onChange={(e) => setOverviewForm({ ...overviewForm, state: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">Phone Number</label>
                      <input
                        type="text"
                        value={overviewForm.phone}
                        onChange={(e) => setOverviewForm({ ...overviewForm, phone: e.target.value })}
                        placeholder="+92 42 3589 1234"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">Email Address</label>
                      <input
                        type="email"
                        value={overviewForm.email}
                        onChange={(e) => setOverviewForm({ ...overviewForm, email: e.target.value })}
                        placeholder="dha@hiradental.com"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-foreground mb-1 block">Display Hours Text</label>
                      <input
                        type="text"
                        value={overviewForm.hoursInfo}
                        onChange={(e) => setOverviewForm({ ...overviewForm, hoursInfo: e.target.value })}
                        placeholder="Mon - Sat: 9:00 AM - 9:00 PM (Emergency on-call 24/7)"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-foreground mb-1 block">Branch Photograph</label>
                      <div className="flex items-center gap-4">
                        {overviewForm.imageUrl && (
                          <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border shrink-0 bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={resolveMediaUrl(overviewForm.imageUrl) || undefined}
                              alt="Facility"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setOverviewForm({ ...overviewForm, imageUrl: "" })}
                              className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5 hover:bg-black"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="flex-1 space-y-2">
                          <label className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg text-xs font-medium text-muted-foreground hover:border-primary hover:text-foreground cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            {isUploadingPhoto ? "Uploading..." : "Upload Branch Photo (max 20MB)"}
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
                            value={overviewForm.imageUrl}
                            onChange={(e) => setOverviewForm({ ...overviewForm, imageUrl: e.target.value })}
                            placeholder="Or paste direct image URL (https://...)"
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/20 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={overviewForm.isPrimary}
                          onChange={(e) => setOverviewForm({ ...overviewForm, isPrimary: e.target.checked })}
                          className="w-4 h-4 rounded text-primary focus:ring-primary"
                        />
                        <div>
                          <div className="text-xs font-semibold text-foreground">Designate as Primary Headquarters Branch</div>
                          <div className="text-[11px] text-muted-foreground">Default location selected for general inquiries.</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border flex justify-end">
                    <Button type="submit" disabled={isSaving} className="gap-2 font-semibold">
                      {isSaving ? "Saving..." : "Save Overview Changes"}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* TAB 2: SERVICES (Enable/Disable catalog services at this branch) */}
            {activeTab === "services" && (
              <Card className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-foreground">Services Offered at {selectedBranch.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Select which clinical procedures from the central catalog are available at this branch.
                    </p>
                  </div>

                  <Button onClick={handleSaveLocationServices} disabled={isSaving} className="gap-2 font-semibold shrink-0">
                    <Check className="w-4 h-4" />
                    {isSaving ? "Saving..." : "Save Service Offerings"}
                  </Button>
                </div>

                {/* Informational Guidance */}
                <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary shrink-0" />
                    <span>
                      To assign specific doctors to these procedures or customize appointment duration per clinician, visit{" "}
                      <strong>Team Management → Services</strong>.
                    </span>
                  </div>
                  <Link href="/admin/team">
                    <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                      <Users className="w-3 h-3" /> Teams
                    </Button>
                  </Link>
                </div>

                {/* Filter */}
                <div className="relative max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filter procedures..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {isLoadingServices ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    Loading branch catalog...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {locationServices
                      .filter(
                        (s) =>
                          serviceSearch === "" ||
                          s.title.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                          s.category.toLowerCase().includes(serviceSearch.toLowerCase())
                      )
                      .map((srv) => (
                        <div
                          key={srv.id}
                          onClick={() => handleToggleService(srv.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${srv.isOffered
                              ? "bg-primary/5 border-primary/30"
                              : "bg-muted/10 border-border hover:bg-muted/20"
                            }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">{srv.title}</span>
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                {srv.category}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Standard Fee: {srv.cashPrice || "Standard"} • Duration: {srv.duration || "45m"}
                            </div>
                          </div>

                          <div className="shrink-0">
                            <input
                              type="checkbox"
                              checked={srv.isOffered}
                              onChange={() => { }} // handled by parent div onClick
                              className="w-4 h-4 rounded text-primary focus:ring-primary"
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </Card>
            )}

            {/* TAB 3: TEAM (Assigned Doctors) */}
            {activeTab === "team" && (
              <Card className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-foreground">Doctors Assigned to {selectedBranch.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Clinicians authorized to take appointments and hold weekly shifts at this branch.
                    </p>
                  </div>
                </div>

                {/* Assign Doctor Selector Bar */}
                <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1">
                    <select
                      value={selectedDoctorToAssign}
                      onChange={(e) => setSelectedDoctorToAssign(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Select a clinician to assign to this branch...</option>
                      {allTeamMembers
                        .filter((m) => !assignedDoctors.some((a) => a.teamMemberId === m.id))
                        .map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.displayName} ({doc.specialties?.join(", ") || doc.professionalTitle || "Dental Surgeon"})
                          </option>
                        ))}
                    </select>
                  </div>
                  <Button
                    onClick={handleAssignDoctor}
                    disabled={!selectedDoctorToAssign || isSaving}
                    size="sm"
                    className="gap-2 font-semibold shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Assign to Branch
                  </Button>
                </div>

                {isLoadingDoctors ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    Loading branch clinicians...
                  </div>
                ) : assignedDoctors.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl p-8">
                    No clinicians are currently assigned to this branch. Use the selector above to assign doctors.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assignedDoctors.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-4 rounded-xl border border-border bg-card flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
                            {(doc.doctorName || "D").charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-foreground">{doc.doctorName || "Clinician"}</h4>
                            <span className="text-[11px] text-muted-foreground block mb-1.5">
                              Active branch clinician
                            </span>
                            {/* Shifts at this branch */}
                            {branchDoctorShifts[doc.teamMemberId] && branchDoctorShifts[doc.teamMemberId].length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {branchDoctorShifts[doc.teamMemberId].map((s) => {
                                  const dayName = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][s.dayOfWeek] || "Day";
                                  return (
                                    <span
                                      key={s.id}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium"
                                    >
                                      {dayName}: {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                                No shifts configured at this branch
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link href="/admin/team">
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                              <Settings className="w-3 h-3" /> Configure in Team
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnassignDoctor(doc.teamMemberId)}
                            disabled={isSaving}
                            className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* TAB 4: OPENING HOURS */}
            {activeTab === "hours" && (
              <Card className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-foreground">Operating Schedule & Shifts</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure weekly operating hours, opening/closing times, and 24/7 emergency readiness.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={handleSetStandardHours} className="text-xs">
                      Standard (9am-6pm)
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSet247Hours} className="text-xs">
                      24/7 Readiness
                    </Button>
                    <Button onClick={handleSaveWorkingHours} disabled={isSaving} className="gap-2 font-semibold text-xs">
                      <Check className="w-3.5 h-3.5" />
                      Save Operating Schedule
                    </Button>
                  </div>
                </div>

                {isLoadingHours ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    Loading hours...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {workingHours.map((wh, idx) => (
                      <div
                        key={wh.dayOfWeek}
                        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${wh.isClosed ? "bg-muted/15 border-border/60 opacity-60" : "bg-card border-border"
                          }`}
                      >
                        <div className="flex items-center gap-3 w-36">
                          <span className="font-bold text-xs uppercase tracking-wider text-foreground">
                            {DAY_NAMES[wh.dayOfWeek]}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 flex-1">
                          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={wh.isClosed}
                              onChange={(e) => {
                                const updated = [...workingHours];
                                updated[idx].isClosed = e.target.checked;
                                setWorkingHours(updated);
                              }}
                              className="w-4 h-4 rounded text-primary focus:ring-primary"
                            />
                            <span>Closed</span>
                          </label>

                          {!wh.isClosed && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground font-medium">Open:</span>
                              <input
                                type="time"
                                value={wh.openTime || "09:00"}
                                onChange={(e) => {
                                  const updated = [...workingHours];
                                  updated[idx].openTime = e.target.value;
                                  setWorkingHours(updated);
                                }}
                                className="px-2.5 py-1 text-xs rounded-md border border-border bg-background outline-none font-mono"
                              />
                              <span className="text-muted-foreground font-medium">Close:</span>
                              <input
                                type="time"
                                value={wh.closeTime || "17:00"}
                                onChange={(e) => {
                                  const updated = [...workingHours];
                                  updated[idx].closeTime = e.target.value;
                                  setWorkingHours(updated);
                                }}
                                className="px-2.5 py-1 text-xs rounded-md border border-border bg-background outline-none font-mono"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* TAB 5: BOOKING SETTINGS */}
            {activeTab === "booking" && (
              <Card className="p-6 space-y-6 max-w-3xl">
                <div>
                  <h3 className="text-base font-bold text-foreground">Branch Booking Policies</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Slot scheduling intervals, lead times, and provisional reservation hold cutoffs.
                  </p>
                </div>

                {isLoadingBookingRules ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    Loading booking policies...
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">
                          Slot Interval (Minutes)
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={120}
                          step={5}
                          value={bookingRules.slotIntervalMinutes}
                          onChange={(e) =>
                            setBookingRules({ ...bookingRules, slotIntervalMinutes: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">Calendar increments for patient slots.</p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">
                          Minimum Notice Lead Time (Hours)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={72}
                          value={bookingRules.minLeadTimeHours}
                          onChange={(e) =>
                            setBookingRules({ ...bookingRules, minLeadTimeHours: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">Prevents walk-in double booking surprises.</p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">
                          Advance Booking Horizon (Days)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={bookingRules.advanceBookingDays}
                          onChange={(e) =>
                            setBookingRules({ ...bookingRules, advanceBookingDays: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">How far in advance patients can book.</p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">
                          Provisional Hold Cutoff (Minutes)
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={120}
                          value={bookingRules.holdMinutes}
                          onChange={(e) =>
                            setBookingRules({ ...bookingRules, holdMinutes: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">Temporary hold window while patient checks out.</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border flex items-center justify-between">
                      <Link href="/admin/booking" className="text-xs text-primary hover:underline font-semibold flex items-center gap-1">
                        <Settings className="w-3.5 h-3.5" /> Emergency Mode & Global Rules →
                      </Link>
                      <Button onClick={handleSaveBookingRules} disabled={isSaving} className="gap-2 font-semibold">
                        {isSaving ? "Saving..." : "Save Booking Policies"}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE NEW BRANCH MODAL (Light Mode Enterprise SaaS Theme) */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSaving) setCreateModalOpen(false);
          }}
        >
          <div className="w-full max-w-2xl bg-white text-slate-900 border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary">New Practice Facility</span>
                  <h2 className="text-lg font-bold text-slate-900">Add Clinic Branch</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Register a physical practice branch, contact channels, address details, and clinical reference photos.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Form Body */}
            <form id="create-branch-form" onSubmit={handleCreateBranch} className="p-6 sm:p-7 space-y-6 overflow-y-auto flex-1">
              {/* GROUP 1: Basic Information */}
              <div className="bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Basic Facility Information
                  </h3>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Facility / Branch Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="e.g. DHDC Phase 5 Dental Care & Surgery"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      placeholder="e.g. branch.dha5@hiradental.com"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      placeholder="e.g. +92 42 3589 1234"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Short Description / About this branch
                  </label>
                  <textarea
                    rows={2}
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="Provide a brief clinical overview, landmark directions, parking cues, or specific specialties offered at this branch..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium transition-all resize-y"
                  />
                </div>
              </div>

              {/* GROUP 2: Location Details */}
              <div className="bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Physical Location Details
                  </h3>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Street Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.addressLine1}
                    onChange={(e) => setCreateForm({ ...createForm, addressLine1: e.target.value })}
                    placeholder="e.g. Plaza 45, Sector B, Commercial Broadway"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.city}
                      onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                      placeholder="e.g. Lahore"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      State / Province <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.state}
                      onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })}
                      placeholder="e.g. Punjab"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Postal Code</label>
                    <input
                      type="text"
                      value={createForm.postalCode}
                      onChange={(e) => setCreateForm({ ...createForm, postalCode: e.target.value })}
                      placeholder="e.g. 54000"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* GROUP 3: Branch Images (1 to 5 Images) */}
              <div className="bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Branch Images &amp; Visual References
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
                    {branchImages.length} / 5 attached
                  </span>
                </div>

                <p className="text-[11px] text-slate-500">
                  Upload exterior facade, reception lobby, or operatory photographs (up to 5 images, max 5MB each).
                </p>

                {/* Hidden File Input */}
                <input
                  ref={branchFileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    processBranchFiles(e.target.files);
                    if (e.target) e.target.value = "";
                  }}
                />

                {/* Modern Drag & Drop Zone */}
                <div
                  onDragOver={handleBranchDragOver}
                  onDragLeave={handleBranchDragLeave}
                  onDrop={handleBranchDrop}
                  onClick={() => {
                    if (branchImages.length < 5) {
                      branchFileInputRef.current?.click();
                    }
                  }}
                  className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                    branchImages.length >= 5
                      ? "border-slate-200 bg-white cursor-not-allowed opacity-60"
                      : isBranchDragging
                      ? "border-primary bg-primary/5 cursor-copy"
                      : "border-slate-300 hover:border-primary/50 hover:bg-white bg-white/70 cursor-pointer"
                  }`}
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        {branchImages.length >= 5
                          ? "Maximum limit of 5 branch images reached"
                          : "Drag & drop branch photos here, or click to browse"}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Supports PNG, JPG, WEBP (up to 5MB each)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Thumbnail Previews Grid */}
                {branchImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                    {branchImages.map((img, idx) => (
                      <div
                        key={img.id}
                        className="group relative rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs overflow-hidden flex flex-col"
                      >
                        <div className="aspect-square w-full rounded-lg bg-slate-100 overflow-hidden relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.url}
                            alt={img.name}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeBranchImage(img.id);
                            }}
                            title="Remove image"
                            aria-label={`Remove ${img.name}`}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md transition-all cursor-pointer opacity-90 group-hover:opacity-100"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="mt-1 px-1">
                          <p className="text-[10px] font-semibold text-slate-700 truncate" title={img.name}>
                            {idx + 1}. {img.name}
                          </p>
                          <p className="text-[9px] text-slate-400">
                            {(img.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="create-branch-form"
                variant="primary"
                size="sm"
                disabled={isSaving}
                className="font-semibold shadow-xs px-5"
              >
                {isSaving ? "Creating..." : "Create Branch"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Unified Entity Details Modal */}
      <EntityDetailsModal
        isOpen={Boolean(selectedEntityModal)}
        onClose={() => setSelectedEntityModal(null)}
        initialEntity={selectedEntityModal}
        allServices={allServices}
        allTeamMembers={allTeam}
        allLocations={locations}
        accessToken={accessToken}
      />
    </AnimatedPage>
  );
}
