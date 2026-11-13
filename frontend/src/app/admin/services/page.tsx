"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, Reorder } from "motion/react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Building2,
  Check,
  Clock,
  Compass,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  Layers,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Stethoscope,
  Tag,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { Skeleton } from "@/components/ui/skeleton";
import { SuccessAlert } from "@/components/ui/success-draw";
import { useAuth } from "@/components/providers/auth-provider";
import { AnimatedPage } from "@/components/ui/animated-page";
import { Pagination } from "@/components/ui/pagination";
import { EntityDetailsModal, SelectedEntity } from "@/components/modals/entity-details-modal";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { toast } from "sonner";
import { TeamMember, LocationItem, adminGetLocations, adminGetTeam } from "@/lib/api";
import {
  adminCreateService,
  adminDeleteService,
  adminGetServices,
  adminReorderServices,
  adminToggleServiceStatus,
  adminUpdateService,
  adminUploadMedia,
  resolveMediaUrl,
} from "@/lib/api";

const CATEGORIES = [
  { id: "preventive", label: "Preventive Care" },
  { id: "restorative", label: "Restorative" },
  { id: "cosmetic", label: "Cosmetic" },
  { id: "emergency", label: "Emergency Triage" },
];

export default function AdminServicesPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Unified Entity Details Modal state
  const [selectedEntityModal, setSelectedEntityModal] = useState<SelectedEntity | null>(null);
  const [allTeamMembers, setAllTeamMembers] = useState<TeamMember[]>([]);
  const [allLocations, setAllLocations] = useState<LocationItem[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");

  // Pagination state (Blueprint Phase 4)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Reset pagination to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, statusFilter]);



  // Drawer / Form state for Add/Edit Service
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Delete service state
  const [serviceToDelete, setServiceToDelete] = useState<any | null>(null);
  const [isDeletingService, setIsDeletingService] = useState(false);

  // Drawer keyboard accessibility (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawerOpen) {
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen]);

  const [form, setForm] = useState({
    slug: "",
    category: "preventive",
    title: "",
    shortDesc: "",
    fullDesc: "",
    cashPrice: "",
    duration: "45 min",
    code: "",
    insuranceNote: "",
    recommendedInterval: "Every 6 months",
    recallIntervalDays: 180 as number | undefined,
    displayOrder: 0,
    isHighlighted: false,
    isPublic: true,
    bookableOnline: true,
    bufferMinutes: 0,
    imageUrl: "",
  });

  const loadData = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [servicesData, teamData, locData] = await Promise.all([
        adminGetServices(accessToken),
        adminGetTeam(accessToken).catch(() => []),
        adminGetLocations(accessToken).catch(() => []),
      ]);
      setServices(servicesData);
      setAllTeamMembers(teamData);
      setAllLocations(locData);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load services data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      loadData();
    });
  }, [accessToken]);

  const openAddDrawer = () => {
    setEditingId(null);
    setForm({
      slug: "",
      category: "preventive",
      title: "",
      shortDesc: "",
      fullDesc: "",
      cashPrice: "Rs. 3,500",
      duration: "45 min",
      code: `SRV-${String(services.length + 1).padStart(2, "0")}`,
      insuranceNote: "",
      recommendedInterval: "Every 6 months",
      recallIntervalDays: 180,
      displayOrder: services.length,
      isHighlighted: false,
      isPublic: true,
      bookableOnline: true,
      bufferMinutes: 0,
      imageUrl: "",
    });
    setDrawerOpen(true);
  };

  const openEditDrawer = (service: any) => {
    setEditingId(service.id);
    setForm({
      slug: service.slug || "",
      category: service.category || "preventive",
      title: service.title || "",
      shortDesc: service.shortDesc || "",
      fullDesc: service.fullDesc || "",
      cashPrice: service.cashPrice || "",
      duration: service.duration || "",
      code: service.code || "",
      insuranceNote: service.insuranceNote || "",
      recommendedInterval: service.recommendedInterval || "",
      recallIntervalDays:
        service.recallIntervalDays !== undefined && service.recallIntervalDays !== null
          ? Number(service.recallIntervalDays)
          : undefined,
      displayOrder: service.displayOrder || 0,
      isHighlighted: Boolean(service.isHighlighted),
      isPublic: service.isPublic !== false,
      bookableOnline: service.bookableOnline !== false,
      bufferMinutes: service.bufferMinutes || 0,
      imageUrl: service.imageUrl || "",
    });
    setDrawerOpen(true);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
  };

  const handleTitleChange = (val: string) => {
    setForm((prev) => ({
      ...prev,
      title: val,
      slug: !editingId ? generateSlug(val) : prev.slug,
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage("File exceeds maximum allowed size of 15MB.");
      return;
    }

    setIsUploadingImage(true);
    setErrorMessage(null);
    try {
      const res = await adminUploadMedia(file, accessToken);
      setForm((prev) => ({ ...prev, imageUrl: res.url }));
      setSuccessMessage("Service image uploaded successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload image.";
      setErrorMessage(msg);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setErrorMessage(null);

    if (!form.title.trim() || !form.slug.trim() || !form.cashPrice.trim() || !form.duration.trim()) {
      setErrorMessage("Title, slug, cash price, and duration are required.");
      return;
    }

    setIsSaving(true);
    const payload = {
      slug: form.slug.trim().toLowerCase(),
      category: form.category,
      title: form.title.trim(),
      shortDesc: form.shortDesc.trim() || form.title.trim(),
      fullDesc: form.fullDesc.trim() || null,
      cashPrice: form.cashPrice.trim(),
      duration: form.duration.trim(),
      code: form.code.trim() || null,
      insuranceNote: form.insuranceNote.trim() || null,
      recommendedInterval: form.recommendedInterval.trim() || null,
      recallIntervalDays: form.recallIntervalDays ? Number(form.recallIntervalDays) : null,
      displayOrder: Number(form.displayOrder) || 0,
      isHighlighted: Boolean(form.isHighlighted),
      isPublic: Boolean(form.isPublic),
      bookableOnline: Boolean(form.bookableOnline),
      bufferMinutes: Number(form.bufferMinutes) || 0,
      imageUrl: form.imageUrl.trim() || null,
      isActive: true,
    };

    try {
      if (editingId) {
        await adminUpdateService(editingId, payload, accessToken);
        setSuccessMessage("Service catalog procedure updated successfully.");
      } else {
        await adminCreateService(payload, accessToken);
        setSuccessMessage("New service procedure added to catalog.");
      }
      setDrawerOpen(false);
      setTimeout(() => setSuccessMessage(null), 3500);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save service.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    if (!accessToken) return;
    try {
      await adminToggleServiceStatus(id, !currentStatus, accessToken);
      setSuccessMessage(`Service ${currentStatus ? "archived" : "reactivated"} successfully.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to toggle status.");
    }
  };

  const handleConfirmDeleteService = async () => {
    if (!serviceToDelete || !accessToken) return;
    setIsDeletingService(true);
    const targetId = serviceToDelete.id;
    const targetTitle = serviceToDelete.title;
    try {
      await adminDeleteService(targetId, accessToken);
      toast.success(`Service "${targetTitle}" permanently deleted.`);
      setServices((prev) => prev.filter((s) => s.id !== targetId));
      if (drawerOpen && editingId === targetId) {
        setDrawerOpen(false);
      }
      setServiceToDelete(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete service.");
    } finally {
      setIsDeletingService(false);
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    if (!accessToken) return;
    const target = index + direction;
    if (target < 0 || target >= filteredServices.length) return;
    const ordered = [...services];
    const itemIndex = ordered.findIndex((s) => s.id === filteredServices[index].id);
    const targetItemIndex = ordered.findIndex((s) => s.id === filteredServices[target].id);
    if (itemIndex === -1 || targetItemIndex === -1) return;

    const [moved] = ordered.splice(itemIndex, 1);
    ordered.splice(targetItemIndex, 0, moved);

    try {
      setServices(ordered);
      await adminReorderServices(ordered.map((s) => s.id), accessToken);
      setSuccessMessage("Service display order updated.");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reorder services.");
      loadData();
    }
  };

  // Filtered Services List
  const filteredServices = services.filter((s) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.shortDesc?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || s.category?.toLowerCase() === selectedCategory.toLowerCase();

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && s.isActive !== false) ||
      (statusFilter === "archived" && s.isActive === false);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Paginated slice for current page
  const paginatedServices = filteredServices.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <AnimatedPage className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Top Banner / IA Breadcrumb */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="flex items-start gap-3.5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                Catalog Management
              </span>
              <span className="text-xs text-muted-foreground">WHAT we offer</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Services Catalog</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Central repository of dental procedures, standard fees, durations, and website visibility.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={openAddDrawer} className="gap-2 shadow-sm font-semibold">
            <Plus className="w-4 h-4" />
            Add New Service
          </Button>
        </div>
      </div>

      {/* Cross-Domain Architecture Callout - Soft & Airy */}
      <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-gradient-to-r from-emerald-50/70 via-teal-50/30 to-slate-50/60 dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-slate-900 p-5 shadow-xs transition-all">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Decoupled Information Architecture</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                • <strong>Services</strong> defines procedure catalog, fees, and baseline duration.<br />
                • To configure <strong>WHERE</strong> services are offered, visit{" "}
                <Link href="/admin/locations" className="text-emerald-700 dark:text-emerald-400 hover:underline font-medium">
                  Locations
                </Link>.<br />
                • To assign <strong>WHO</strong> performs each service with custom durations, visit{" "}
                <Link href="/admin/team" className="text-emerald-700 dark:text-emerald-400 hover:underline font-medium">
                  Team
                </Link>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            <Link href="/admin/locations">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900 shadow-xs hover:bg-slate-50">
                <Building2 className="w-3.5 h-3.5" />
                Manage Locations
              </Button>
            </Link>
            <Link href="/admin/team">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900 shadow-xs hover:bg-slate-50">
                <Users className="w-3.5 h-3.5" />
                Manage Team
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Alerts */}
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

      {/* Filter and Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by procedure title, slug, or billing code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
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

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Status:</span>
            <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${statusFilter === "all" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                All ({services.length})
              </button>
              <button
                onClick={() => setStatusFilter("active")}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${statusFilter === "active" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Active ({services.filter((s) => s.isActive !== false).length})
              </button>
              <button
                onClick={() => setStatusFilter("archived")}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${statusFilter === "archived" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Archived ({services.filter((s) => s.isActive === false).length})
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all ${selectedCategory === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
          >
            All Categories
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all ${selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Services List / Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`skel-service-${i}`}
              className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-4 w-16 rounded" />
              </div>
              <div className="flex items-start gap-3">
                <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-2/3" />
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl grid grid-cols-2 gap-2">
                <Skeleton className="h-7 w-full rounded-lg" />
                <Skeleton className="h-7 w-full rounded-lg" />
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <Skeleton className="h-4 w-28 rounded-full" />
                <Skeleton className="h-4 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <Card className="p-12 text-center border-dashed space-y-4">
          <div className="w-12 h-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg">No services found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchQuery || selectedCategory !== "all" || statusFilter !== "all"
                ? "No procedures match the current filters. Try resetting search or category."
                : "The service catalog is empty. Click below to add your first clinical procedure."}
            </p>
          </div>
          <Button onClick={openAddDrawer} size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> Add Service
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          <Reorder.Group
            axis="y"
            values={services}
            onReorder={async (newOrder) => {
              setServices(newOrder);
              try {
                await adminReorderServices(newOrder.map((s) => s.id), accessToken || undefined);
                setSuccessMessage("Service display order updated.");
              } catch (err: unknown) {
                setErrorMessage(err instanceof Error ? err.message : "Failed to reorder services.");
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {paginatedServices.map((service, idx) => (
              <Reorder.Item
                key={service.id}
                value={service}
                layoutId={`service-entity-${service.id}`}
                whileDrag={{
                  scale: 1.05,
                  boxShadow: "0 20px 30px -10px rgba(0, 0, 0, 0.25)",
                  zIndex: 40,
                }}
                transition={{
                  duration: 0.2, // 200ms surrounding rows slide out of the way
                  ease: "easeOut",
                }}
                className="cursor-grab active:cursor-grabbing"
              >
                <Card
                  onClick={() => setSelectedEntityModal({ type: "service", id: service.id, data: service })}
                  className={`h-full overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between cursor-pointer group/card ${service.isActive === false ? "opacity-60 bg-slate-50/50 dark:bg-slate-900/40" : ""
                    }`}
                >
                  <div>
                    {/* 2026 Luxury Panoramic Top-Banner Image Header (h-44, 16:9 full visibility) */}
                    <div className="relative h-44 w-full overflow-hidden bg-slate-900 border-b border-border/40">
                      {service.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveMediaUrl(service.imageUrl) || undefined}
                          alt={service.title}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                          className="w-full h-full object-cover object-center group-hover/card:scale-105 transition-transform duration-700 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white/40">
                          <Layers className="w-10 h-10 mb-1 opacity-40" />
                          <span className="text-[11px] font-mono uppercase tracking-wider">Clinical Procedure</span>
                        </div>
                      )}

                      {/* Vignette Gradient Overlay */}
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

                      {/* Floating Frosted Badges Over Panoramic Header */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                        <span className="backdrop-blur-md bg-black/60 text-white border border-white/20 text-[11px] font-semibold px-3 py-1 rounded-full shadow-md tracking-wide uppercase">
                          {CATEGORIES.find((c) => c.id === service.category)?.label || service.category}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {service.code && (
                            <span className="backdrop-blur-md bg-black/60 text-white/90 border border-white/20 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md shadow-sm">
                              {service.code}
                            </span>
                          )}
                          {service.isHighlighted && (
                            <span className="backdrop-blur-md bg-amber-500/85 text-white border border-amber-300/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                              <Sparkles className="w-3 h-3" /> Featured
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Procedure Details */}
                    <div className="p-5 pb-3 space-y-2">
                      <h3 className="font-display font-bold text-lg text-foreground line-clamp-1 group-hover/card:text-primary transition-colors">
                        {service.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {service.shortDesc || "No short clinical description provided."}
                      </p>
                    </div>

                    {/* Key Metrics - Sleek Glassmorphic Bar */}
                    <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl mx-5 my-1.5 border border-slate-200/60 dark:border-white/5 grid grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Tag className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Standard Fee</div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 font-mono truncate">{service.cashPrice}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Duration</div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{service.duration}</div>
                        </div>
                      </div>
                    </div>

                    {/* Visibility Badges */}
                    <div className="px-5 py-2.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${service.bookableOnline !== false
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium"
                            : "bg-muted text-muted-foreground line-through"
                          }`}
                      >
                        <Check className="w-3 h-3" /> Online Booking
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${service.isPublic !== false
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium"
                            : "bg-muted text-muted-foreground line-through"
                          }`}
                      >
                        <Eye className="w-3 h-3" /> Website Visible
                      </span>
                      {service.bufferMinutes > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted font-medium">
                          +{service.bufferMinutes}m buffer
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div onClick={(e) => e.stopPropagation()} className="px-5 py-3 border-t border-slate-100 dark:border-slate-800/60 bg-transparent flex items-center justify-between gap-2">
                    {/* Reorder Arrows */}
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => handleMove(idx, -1)}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMove(idx, 1)}
                        disabled={idx === filteredServices.length - 1}
                        title="Move Down"
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(service.id, service.isActive !== false)}
                        className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${service.isActive !== false
                            ? "text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                            : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                          }`}
                      >
                        {service.isActive !== false ? "Archive" : "Activate"}
                      </button>
                      <button
                        onClick={() => setServiceToDelete(service)}
                        title="Delete service permanently"
                        className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-md transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                        aria-label={`Delete ${service.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDrawer(service)}
                        className="gap-1.5 text-xs h-8"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </Card>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          {/* Scalable Server/Client Pagination Component */}
          <Pagination
            currentPage={currentPage}
            totalItems={filteredServices.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[6, 12, 24]}
            itemName="Services"
            className="pt-2"
          />
        </div>
      )}

      {/* Add / Edit Service Structured Drawer - Soft, Elegant & Rounded */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDrawerOpen(false);
          }}
        >
          <div className="h-full w-full max-w-2xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-l-3xl shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]">
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between shrink-0">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Catalog Definition</span>
                <h2 className="text-xl font-bold text-foreground mt-0.5">
                  {editingId ? "Edit Procedure" : "Add New Procedure"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure procedure details, fee, standard duration, and website visibility.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body - Scrollable Form with 5 Structured Sections */}
            <form id="service-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* SECTION 1: Basic Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                  <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">1</span>
                  <h3 className="font-semibold text-foreground text-sm">Basic Information</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-foreground mb-1.5 block">Procedure Title *</label>
                    <input
                      type="text"
                      required
                      value={form.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="e.g. Routine Examination & Hygiene"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground placeholder:text-muted-foreground outline-none font-medium transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">URL Slug *</label>
                    <input
                      type="text"
                      required
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      placeholder="routine-examination-hygiene"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">Category *</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground placeholder:text-muted-foreground outline-none font-medium transition-all"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">Billing / Insurance Code</label>
                    <input
                      type="text"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="e.g. D0120, SRV-01"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">Insurance Coverage Note</label>
                    <input
                      type="text"
                      value={form.insuranceNote}
                      onChange={(e) => setForm({ ...form, insuranceNote: e.target.value })}
                      placeholder="e.g. Usually 80% covered by primary"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground placeholder:text-muted-foreground outline-none font-medium transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Description & Media */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                  <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">2</span>
                  <h3 className="font-semibold text-foreground text-sm">Description & Media</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">Short Summary *</label>
                    <textarea
                      rows={2}
                      value={form.shortDesc}
                      onChange={(e) => setForm({ ...form, shortDesc: e.target.value })}
                      placeholder="Brief overview shown on booking cards and search results..."
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground placeholder:text-muted-foreground outline-none font-medium transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">Full Clinical Description</label>
                    <textarea
                      rows={4}
                      value={form.fullDesc}
                      onChange={(e) => setForm({ ...form, fullDesc: e.target.value })}
                      placeholder="Comprehensive procedure description, patient preparation, and post-treatment guidance..."
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground placeholder:text-muted-foreground outline-none font-medium transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">Service Image / Illustration</label>
                    <div className="flex items-center gap-4">
                      {form.imageUrl ? (
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20 w-full">
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border shrink-0 bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={resolveMediaUrl(form.imageUrl) || undefined}
                              alt={form.title}
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                              }}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold text-foreground block truncate">Service Thumbnail</span>
                            <span className="text-[11px] text-muted-foreground block truncate font-mono">
                              {form.imageUrl.split("/").pop()}
                            </span>
                            <div className="flex items-center gap-2 mt-2">
                              <label className="text-[11px] font-semibold text-primary hover:underline cursor-pointer">
                                Change Image
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageUpload}
                                  disabled={isUploadingImage}
                                  className="hidden"
                                />
                              </label>
                              <span className="text-muted-foreground">·</span>
                              <button
                                type="button"
                                onClick={() => setForm({ ...form, imageUrl: "" })}
                                className="text-[11px] font-semibold text-destructive hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-border rounded-xl text-xs font-medium text-muted-foreground hover:border-primary hover:text-foreground cursor-pointer transition-colors w-full bg-muted/10">
                          <Upload className="w-5 h-5 text-primary" />
                          <span>{isUploadingImage ? "Uploading..." : "Click to upload procedure illustration (max 15MB)"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={isUploadingImage}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Pricing & Duration */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                  <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">3</span>
                  <h3 className="font-semibold text-foreground text-sm">Pricing & Duration</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">Standard Cash Fee *</label>
                    <input
                      type="text"
                      required
                      value={form.cashPrice}
                      onChange={(e) => setForm({ ...form, cashPrice: e.target.value })}
                      placeholder="e.g. Rs. 4,500"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground placeholder:text-muted-foreground outline-none font-medium transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">Baseline Duration *</label>
                    <input
                      type="text"
                      required
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: e.target.value })}
                      placeholder="e.g. 45 min"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground placeholder:text-muted-foreground outline-none font-medium transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">Recall Interval (Days)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.recallIntervalDays ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          recallIntervalDays: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      placeholder="e.g. 180"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground placeholder:text-muted-foreground outline-none font-medium transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">Recommended Interval Label</label>
                    <input
                      type="text"
                      value={form.recommendedInterval}
                      onChange={(e) => setForm({ ...form, recommendedInterval: e.target.value })}
                      placeholder="e.g. Every 6 months"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground placeholder:text-muted-foreground outline-none font-medium transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: Website Visibility */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                  <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">4</span>
                  <h3 className="font-semibold text-foreground text-sm">Website Visibility</h3>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                    <div>
                      <div className="font-semibold text-sm text-foreground">Public Website Display</div>
                      <div className="text-xs text-muted-foreground">Show this procedure on the public treatments and services showcase.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.isPublic}
                      onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                      className="w-4 h-4 rounded text-primary focus:ring-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                    <div>
                      <div className="font-semibold text-sm text-foreground">Featured Treatment</div>
                      <div className="text-xs text-muted-foreground">Highlight prominently on the homepage hero treatments section.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.isHighlighted}
                      onChange={(e) => setForm({ ...form, isHighlighted: e.target.checked })}
                      className="w-4 h-4 rounded text-primary focus:ring-primary"
                    />
                  </label>
                </div>
              </div>

              {/* SECTION 5: General Booking Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                  <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">5</span>
                  <h3 className="font-semibold text-foreground text-sm">General Booking Settings</h3>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                    <div>
                      <div className="font-semibold text-sm text-foreground">Online Patient Booking</div>
                      <div className="text-xs text-muted-foreground">Allow patients to book this procedure through the public online booking widget.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.bookableOnline}
                      onChange={(e) => setForm({ ...form, bookableOnline: e.target.checked })}
                      className="w-4 h-4 rounded text-primary focus:ring-primary"
                    />
                  </label>

                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">Default Buffer Minutes</label>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={form.bufferMinutes}
                      onChange={(e) => setForm({ ...form, bufferMinutes: Number(e.target.value) || 0 })}
                      placeholder="e.g. 10 (minutes for sanitization/turnaround)"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground placeholder:text-muted-foreground outline-none font-medium transition-all"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Clinicians can override this buffer specifically in Team Management.
                    </p>
                  </div>
                </div>

                {/* Scope Guidance Box */}
                <div className="p-4 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">Need to configure branch offerings or doctor permissions?</p>
                  <p>
                    • Branches choose which catalog services they offer in{" "}
                    <Link href="/admin/locations" className="text-primary hover:underline font-medium">
                      Locations → Services
                    </Link>
                    .
                  </p>
                  <p>
                    • Doctors are authorized to perform services with custom duration overrides in{" "}
                    <Link href="/admin/team" className="text-primary hover:underline font-medium">
                      Team → Services
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </form>

            {/* Drawer Footer - Frosted Glass Bar */}
            <div className="p-5 border-t border-border bg-card flex items-center justify-between gap-3 rounded-bl-3xl shrink-0">
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const currentSvc = services.find((s) => s.id === editingId);
                    if (currentSvc) setServiceToDelete(currentSvc);
                  }}
                  className="gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-rose-200 dark:border-rose-900/50 rounded-xl px-4 py-2.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Permanently
                </Button>
              ) : <div />}

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDrawerOpen(false)}
                  disabled={isSaving}
                  className="rounded-xl px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="service-form"
                  disabled={isSaving}
                  className="rounded-xl px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs transition-all"
                >
                  {isSaving ? "Saving..." : editingId ? "Save Changes" : "Create Procedure"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Unified Entity Details Modal */}
      <EntityDetailsModal
        isOpen={Boolean(selectedEntityModal)}
        onClose={() => setSelectedEntityModal(null)}
        initialEntity={selectedEntityModal}
        allServices={services}
        allTeamMembers={allTeamMembers}
        allLocations={allLocations}
        accessToken={accessToken}
      />

      {/* Permanent Delete Confirmation Dialog */}
      <DestructiveConfirmDialog
        isOpen={Boolean(serviceToDelete)}
        title={serviceToDelete ? `Delete Service "${serviceToDelete.title}"?` : "Delete Service"}
        description="This action permanently deletes this clinical procedure from the database along with its clinic and doctor assignments. If this service is referenced in past patient clinical charts, deletion will be blocked and you should Archive it instead."
        confirmText="Delete Service"
        variant="danger"
        isSubmitting={isDeletingService}
        onConfirm={handleConfirmDeleteService}
        onClose={() => setServiceToDelete(null)}
      />
    </AnimatedPage>
  );
}
