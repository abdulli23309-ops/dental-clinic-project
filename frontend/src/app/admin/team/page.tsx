"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Edit,
  GraduationCap,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { useAuth } from "@/components/providers/auth-provider";
import { AnimatedPage } from "@/components/ui/animated-page";
import {
  adminCreateTeamMember,
  adminGetLocations,
  adminGetRoles,
  adminGetTeam,
  adminReorderTeam,
  adminToggleTeamMemberStatus,
  adminUpdateTeamMember,
  adminUploadMedia,
  LocationItem,
  RoleItem,
  TeamMember,
  resolveMediaUrl,
} from "@/lib/api";

export default function AdminTeamPage() {
  const { accessToken } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search, Filter, Sort & Pagination state (Client-side)
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"display_order" | "name" | "role" | "newest">("display_order");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<{
    firstName: string;
    lastName: string;
    displayName: string;
    professionalTitle: string;
    role: string;
    specialties: string;
    biography: string;
    education: string;
    credentials: string;
    licenseNumber: string;
    licenseState: string;
    photoUrl: string;
    locationId: string | null;
    displayOrder: number;
    showPatientsTreated: boolean;
  }>({
    firstName: "",
    lastName: "",
    displayName: "",
    professionalTitle: "",
    role: "Dentist",
    specialties: "",
    biography: "",
    education: "",
    credentials: "",
    licenseNumber: "",
    licenseState: "",
    photoUrl: "",
    locationId: null,
    displayOrder: 0,
    showPatientsTreated: true,
  });

  const [isUploading, setIsUploading] = useState(false);

  const loadData = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const [membersData, locData, rolesData] = await Promise.all([
        adminGetTeam(accessToken),
        adminGetLocations(accessToken).catch(() => []),
        adminGetRoles(accessToken).catch(() => []),
      ]);
      setTeamMembers(membersData);
      setLocations(locData);
      setRoles(rolesData.filter((r) => r.isActive));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load team data.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      loadData();
    }
  }, [accessToken]);

  // Client-side filtering & sorting
  const filteredDoctors = teamMembers.filter((t) => {
    // 1. Multi-field & multi-token search query
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      const fields = [
        t.displayName,
        t.firstName,
        t.lastName,
        t.professionalTitle,
        t.role,
        t.credentials,
        t.biography,
        (t as any).email,
        ...(Array.isArray(t.specialties) ? t.specialties : []),
      ]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase());
      const haystack = fields.join(" ");
      const matchesAllTokens = tokens.every((tok) => haystack.includes(tok));
      if (!matchesAllTokens) return false;
    }

    // 2. Role Filter
    if (roleFilter && roleFilter !== "all") {
      if (t.role.toLowerCase() !== roleFilter.toLowerCase()) {
        return false;
      }
    }

    // 3. Branch Filter
    if (branchFilter && branchFilter !== "all") {
      const branchMatch = t.locationId === branchFilter || (t as any).clinicId === branchFilter;
      if (!branchMatch) {
        return false;
      }
    }

    return true;
  });

  const sortedDoctors = [...filteredDoctors].sort((a, b) => {
    if (sortBy === "name") {
      const nameA = a.displayName || `${a.firstName} ${a.lastName}`;
      const nameB = b.displayName || `${b.firstName} ${b.lastName}`;
      return nameA.localeCompare(nameB);
    }
    if (sortBy === "role") {
      return a.role.localeCompare(b.role);
    }
    if (sortBy === "newest") {
      const dateA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
      const dateB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
      return dateB - dateA;
    }
    return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
  });

  const totalPages = Math.max(1, Math.ceil(sortedDoctors.length / ITEMS_PER_PAGE));
  const paginatedDoctors = sortedDoctors.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      firstName: "",
      lastName: "",
      displayName: "",
      professionalTitle: "",
      role: "Dentist",
      specialties: "",
      biography: "",
      education: "",
      credentials: "",
      licenseNumber: "",
      licenseState: "",
      photoUrl: "",
      locationId: locations[0]?.id || null,
      displayOrder: teamMembers.length,
      showPatientsTreated: true,
    });
    setShowModal(true);
  };

  const openEditModal = (member: TeamMember) => {
    setEditingId(member.id);
    setForm({
      firstName: member.firstName,
      lastName: member.lastName,
      displayName: member.displayName,
      professionalTitle: member.professionalTitle,
      role: member.role,
      specialties: member.specialties.join(", "),
      biography: member.biography || "",
      education: member.education || "",
      credentials: member.credentials || "",
      licenseNumber: member.licenseNumber || "",
      licenseState: member.licenseState || "",
      photoUrl: member.photoUrl || "",
      locationId: member.locationId || null,
      displayOrder: member.displayOrder,
      showPatientsTreated: member.showPatientsTreated !== false,
    });
    setShowModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage("File exceeds maximum allowed size of 15MB.");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    try {
      const res = await adminUploadMedia(file, accessToken);
      setForm((prev) => ({ ...prev, photoUrl: res.url }));
      setSuccessMessage("Photo uploaded successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload photo.";
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setErrorMessage(null);

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      displayName: form.displayName.trim() || `${form.firstName} ${form.lastName}`.trim(),
      professionalTitle: form.professionalTitle.trim(),
      role: form.role,
      specialties: form.specialties
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      biography: form.biography.trim() || null,
      education: form.education.trim() || null,
      credentials: form.credentials.trim() || null,
      licenseNumber: form.licenseNumber.trim() || null,
      licenseState: form.licenseState.trim() || null,
      photoUrl: form.photoUrl.trim() || null,
      locationId: form.locationId || null,
      displayOrder: Number(form.displayOrder) || 0,
      showPatientsTreated: Boolean(form.showPatientsTreated),
      isActive: true,
    };

    try {
      if (editingId) {
        await adminUpdateTeamMember(editingId, payload, accessToken);
        setSuccessMessage("Team member updated successfully.");
      } else {
        await adminCreateTeamMember(payload, accessToken);
        setSuccessMessage("New team member added successfully.");
      }
      setShowModal(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save team member.";
      setErrorMessage(msg);
    }
  };

  const handleTogglePatientsTreated = async (member: TeamMember) => {
    if (!accessToken) return;
    const nextVal = member.showPatientsTreated === false ? true : false;
    try {
      await adminUpdateTeamMember(member.id, { showPatientsTreated: nextVal }, accessToken);
      setSuccessMessage(`Patients treated counter ${nextVal ? "enabled" : "hidden"} for ${member.displayName}.`);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to toggle patients treated switch.";
      setErrorMessage(msg);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    if (!accessToken) return;
    try {
      await adminToggleTeamMemberStatus(id, !currentStatus, accessToken);
      setSuccessMessage(`Team member ${currentStatus ? "deactivated" : "reactivated"}.`);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to toggle status.";
      setErrorMessage(msg);
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    if (!accessToken) return;
    const target = index + direction;
    if (target < 0 || target >= teamMembers.length) return;
    const ordered = [...teamMembers];
    const [moved] = ordered.splice(index, 1);
    ordered.splice(target, 0, moved);
    try {
      await adminReorderTeam(ordered.map((m) => m.id), accessToken);
      setTeamMembers(ordered);
      setSuccessMessage("Team display order saved.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reorder team members.";
      setErrorMessage(msg);
    }
  };

  return (
  <AnimatedPage>
    <div className="space-y-6 max-w-5xl">
      {/* Header Bar */}
      <div className="border-b border-line pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Clinical Operations</p>
          <h1 className="text-2xl sm:text-3xl font-display text-ink font-normal">
            Team &amp; Clinicians
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-soft">
            Manage clinical directors, dentists, dental hygienists, and support staff.
          </p>
        </div>

        <Button onClick={openAddModal} variant="primary" size="sm">
          <UserPlus className="h-3.5 w-3.5 mr-1" />
          <span>Add Team Member</span>
        </Button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/40 p-4 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2"
        >
          <Check className="h-4 w-4" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40 p-4 text-xs font-medium text-red-800 dark:text-red-300"
        >
          {errorMessage}
        </div>
      )}

      {/* Search, Filter & Sort Controls */}
      <div className="bg-white dark:bg-gray-900/60 p-4 sm:p-5 rounded-2xl border border-line dark:border-gray-800 shadow-xs space-y-4">
        {/* Top: Search Bar & Count */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft/60 pointer-events-none" />
            <input
              id="team-search"
              type="text"
              placeholder="Search by name, email, or specialty…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-line dark:border-gray-700 bg-cream/70 dark:bg-gray-800/80 pl-9 pr-4 py-2.5 text-xs text-ink dark:text-white placeholder:text-ink-soft/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="text-xs text-ink-soft font-medium self-center shrink-0">
            Showing <span className="font-semibold text-ink dark:text-white">{filteredDoctors.length}</span> of{" "}
            <span className="font-semibold text-ink dark:text-white">{teamMembers.length}</span> clinicians
          </div>
        </div>

        {/* Bottom: Filter & Sort Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-line/50 dark:border-gray-800/50">
          {/* Role Filter */}
          <div>
            <label htmlFor="role-filter" className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wider mb-1">
              Role
            </label>
            <select
              id="role-filter"
              value={roleFilter || ""}
              onChange={(e) => {
                setRoleFilter(e.target.value || null);
                setPage(1);
              }}
              className="w-full rounded-xl border border-line dark:border-gray-700 bg-cream/70 dark:bg-gray-800/80 px-3 py-2 text-xs text-ink dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="">All Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          <div>
            <label htmlFor="branch-filter" className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wider mb-1">
              Branch
            </label>
            <select
              id="branch-filter"
              value={branchFilter || ""}
              onChange={(e) => {
                setBranchFilter(e.target.value || null);
                setPage(1);
              }}
              className="w-full rounded-xl border border-line dark:border-gray-700 bg-cream/70 dark:bg-gray-800/80 px-3 py-2 text-xs text-ink dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="">All Branches</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label htmlFor="sort-by" className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wider mb-1">
              Sort By
            </label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as "display_order" | "name" | "role" | "newest");
                setPage(1);
              }}
              className="w-full rounded-xl border border-line dark:border-gray-700 bg-cream/70 dark:bg-gray-800/80 px-3 py-2 text-xs text-ink dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="display_order">Display Order</option>
              <option value="name">Name (A–Z)</option>
              <option value="role">Role (A–Z)</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Team Members List */}
      {isLoading ? (
        <div className="py-12 flex justify-center items-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-forest border-t-transparent" />
        </div>
      ) : paginatedDoctors.length === 0 ? (
        <div className="rounded-2xl border border-line dark:border-gray-800 bg-cream/50 dark:bg-gray-900/40 p-12 text-center space-y-3">
          <Users className="h-10 w-10 text-ink-soft/40 mx-auto" />
          <p className="text-sm font-medium text-ink dark:text-white">No clinicians match your search or filters.</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setRoleFilter(null);
              setBranchFilter(null);
              setSortBy("display_order");
              setPage(1);
            }}
            className="text-xs text-primary font-semibold hover:underline cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
          {paginatedDoctors.map((member, index) => (
            <Card
              key={member.id}
              index={index}
              hoverLift
              surface={member.isActive ? "cream" : "bone"}
              shadow="subtle"
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start sm:items-center gap-4">
                {/* Photo Thumbnail */}
                <div className="h-16 w-16 rounded-full overflow-hidden border border-line bg-sand/40 shrink-0">
                  {member.photoUrl ? (
                    <img
                      src={resolveMediaUrl(member.photoUrl) || member.photoUrl}
                      alt={member.displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-ink-soft">
                      <Users className="h-6 w-6" />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-base text-ink font-semibold">
                      {member.displayName}
                    </h3>
                    <span className="rounded-full bg-forest/10 px-2.5 py-0.5 text-[10.5px] font-semibold text-forest uppercase">
                      {member.role}
                    </span>
                    {member.isActive ? (
                      <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                        Deactivated / Inactive
                      </span>
                    )}
                    {member.showPatientsTreated !== false ? (
                      <span className="rounded-full bg-blue-100 dark:bg-blue-950 px-2 py-0.5 text-[10px] font-semibold text-blue-800 dark:text-blue-300">
                        Patients Treated: On
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-200 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                        Patients Treated: Off
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-ink-soft font-medium">
                    {member.professionalTitle}
                  </p>

                  {member.licenseNumber && (
                    <p className="text-[11px] text-ink-soft/80 font-mono">
                      License: {member.licenseNumber} ({member.licenseState || "IL"})
                    </p>
                  )}

                  {member.locationId && (
                    <p className="text-[11px] text-forest dark:text-emerald-400 font-medium">
                      Location: {locations.find((l) => l.id === member.locationId)?.name || "Assigned Facility"}
                    </p>
                  )}

                  {member.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {member.specialties.map((spec, i) => (
                        <span
                          key={i}
                          className="rounded bg-sand/60 px-1.5 py-0.5 text-[10px] text-clay font-medium"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                <div className="flex flex-col gap-0.5 mr-1" role="group" aria-label="Reorder team member">
                  <button
                    type="button"
                    onClick={() => handleMove(teamMembers.indexOf(member), -1)}
                    disabled={teamMembers.indexOf(member) === 0}
                    aria-label={`Move ${member.displayName} up`}
                    className="h-5 w-6 rounded border border-line text-ink-soft hover:text-ink hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed text-[10px] leading-none"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(teamMembers.indexOf(member), 1)}
                    disabled={teamMembers.indexOf(member) === teamMembers.length - 1}
                    aria-label={`Move ${member.displayName} down`}
                    className="h-5 w-6 rounded border border-line text-ink-soft hover:text-ink hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed text-[10px] leading-none"
                  >
                    ▼
                  </button>
                </div>

                <Button
                  onClick={() => handleTogglePatientsTreated(member)}
                  variant="secondary"
                  size="sm"
                  title="Toggle patients treated count visibility on booking flow"
                >
                  <span>{member.showPatientsTreated !== false ? "Hide Treated Count" : "Show Treated Count"}</span>
                </Button>

                <Button onClick={() => openEditModal(member)} variant="secondary" size="sm">
                  <Edit className="h-3.5 w-3.5 mr-1" />
                  <span>Edit</span>
                </Button>

                <Button
                  onClick={() => handleToggleStatus(member.id, member.isActive)}
                  variant="secondary"
                  size="sm"
                >
                  <span>{member.isActive ? "Deactivate" : "Reactivate"}</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Pagination Controls */}
        <div className="border-t border-line dark:border-gray-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-ink-soft font-medium">
            Showing {paginatedDoctors.length} of {filteredDoctors.length} clinicians
          </p>

          <div className="flex items-center gap-2">
            <Button
              id="pagination-prev"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              <span>Previous</span>
            </Button>

            <span className="text-xs text-ink-soft px-2">
              Page {page} of {totalPages}
            </span>

            <Button
              id="pagination-next"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
      )}

      {/* Modal Dialog for Add / Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl my-8">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-line dark:border-gray-800 pb-3">
                <h3 className="font-display text-xl text-ink dark:text-white font-semibold">
                  {editingId ? "Edit Team Member" : "Add Team Member"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-full p-1.5 text-xs text-ink-soft hover:text-ink hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    id="member-first"
                    label="First Name"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    required
                  />
                  <TextField
                    id="member-last"
                    label="Last Name"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    id="member-display"
                    label="Display Name (e.g. Dr. Full Name, BDS)"
                    value={form.displayName}
                    onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                    placeholder="e.g. Dr. Attending Clinician, BDS"
                    required
                  />
                  <TextField
                    id="member-title"
                    label="Professional Title"
                    value={form.professionalTitle}
                    onChange={(e) => setForm({ ...form, professionalTitle: e.target.value })}
                    placeholder="Founder & Lead Dentist"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="member-role" className="block text-xs font-medium text-ink dark:text-gray-300 mb-1.5">
                      Role Category
                    </label>
                    <select
                      id="member-role"
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full rounded-2xl border border-line dark:border-gray-700 bg-cream/70 dark:bg-gray-800/80 px-4 py-3 text-xs text-ink dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Select a role…</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <TextField
                    id="member-credentials"
                    label="Credentials (e.g. DDS, DMD, RDH)"
                    value={form.credentials}
                    onChange={(e) => setForm({ ...form, credentials: e.target.value })}
                    placeholder="DDS"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    id="member-specialties"
                    label="Specialties (comma-separated)"
                    value={form.specialties}
                    onChange={(e) => setForm({ ...form, specialties: e.target.value })}
                    placeholder="General Dentistry, Invisalign, Restorative Care"
                  />

                  <div>
                    <label htmlFor="member-location" className="block text-xs font-medium text-ink dark:text-gray-300 mb-1.5">
                      Assigned Facility / Clinic
                    </label>
                    <select
                      id="member-location"
                      value={form.locationId || ""}
                      onChange={(e) => setForm({ ...form, locationId: e.target.value || null })}
                      className="w-full rounded-2xl border border-line dark:border-gray-700 bg-cream/70 dark:bg-gray-800/80 px-4 py-3 text-xs text-ink dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Practice-wide / All Facilities</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} ({loc.city})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="member-bio" className="block text-xs font-medium text-ink dark:text-gray-300 mb-1.5">
                    Biography
                  </label>
                  <textarea
                    id="member-bio"
                    rows={4}
                    value={form.biography}
                    onChange={(e) => setForm({ ...form, biography: e.target.value })}
                    className="w-full rounded-2xl border border-line dark:border-gray-700 bg-cream/70 dark:bg-gray-800/80 px-4 py-3 text-xs text-ink dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    id="member-education"
                    label="Education / Alma Mater"
                    value={form.education}
                    onChange={(e) => setForm({ ...form, education: e.target.value })}
                    placeholder="University of Michigan School of Dentistry"
                  />
                  <TextField
                    id="member-license"
                    label="License Number"
                    value={form.licenseNumber}
                    onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                    placeholder="#019.029811"
                  />
                </div>

                {/* Photo & Upload */}
                <div className="space-y-2">
                  <TextField
                    id="member-photo"
                    label="Photo URL"
                    value={form.photoUrl}
                    onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                    placeholder="https://... or upload local image below"
                  />

                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 rounded-full border border-line dark:border-gray-700 bg-sand/60 dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-ink dark:text-gray-200 cursor-pointer hover:bg-sand dark:hover:bg-gray-700 transition-colors">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{isUploading ? "Uploading..." : "Upload photo file"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </label>
                    {form.photoUrl && (
                      <div className="flex items-center gap-2">
                        <img
                          src={resolveMediaUrl(form.photoUrl) || form.photoUrl}
                          alt="Preview"
                          className="h-8 w-8 rounded-full object-cover border border-line"
                        />
                        <span className="text-[11px] text-forest font-mono truncate max-w-[200px]">
                          Attached: {form.photoUrl}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-cream/40 p-4 space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-medium text-ink dark:text-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      id="member-patients-treated"
                      checked={form.showPatientsTreated}
                      onChange={(e) => setForm({ ...form, showPatientsTreated: e.target.checked })}
                      className="rounded border-line text-forest focus:ring-forest"
                    />
                    <span className="font-semibold">Show Patients Treated Count</span>
                  </label>
                  <p className="text-[11px] text-ink-soft">
                    When checked, the public booking flow displays verified patient count (&quot;N+ patients treated&quot;) for this clinician.
                  </p>
                </div>

                <div className="pt-4 border-t border-line dark:border-gray-800 flex justify-end gap-2.5">
                  <Button type="button" variant="secondary" size="sm" className="rounded-full px-5" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" className="rounded-full px-5">
                    {editingId ? "Update Member" : "Save Team Member"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  </AnimatedPage>
  );
}
