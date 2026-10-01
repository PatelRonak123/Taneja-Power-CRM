import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { navigate, useCurrentPath } from "../../../app/router/navigation";
import { useAuthStore } from "../../../stores/authStore";
import { fieldService } from "../services/fieldService";
import { FsrStatusBadge } from "../components/FsrStatusBadge";
import { FsrCallTypeBadge } from "../components/FsrCallTypeBadge";
import { FsrActivityTimeline } from "../components/FsrActivityTimeline";
import { FsrAssignModal } from "../components/FsrAssignModal";
import { FsrSignOffModal } from "../components/FsrSignOffModal";
import { FsrAttachmentModal } from "../components/FsrAttachmentModal";
import { FsrPdfModal } from "../components/FsrPdfModal";
import {
  canEditFsr,
  canStartFsr,
  canCompleteFsr,
  canCloseFsr,
  canCancelFsr,
  canAssignFse,
  canSignFsr,
  canMutateAttachments,
  canDeleteAttachment,
  canDownloadFsr,
} from "../utils/fsrPermissions";
import { useNotificationStore } from "../../../stores/notificationStore";
import { FsrAttachment } from "../types/field-service.types";
import {
  Wrench,
  Building2,
  Cpu,
  Calendar,
  Activity,
  BatteryCharging,
  DollarSign,
  FileCheck2,
  UserCheck,
  UploadCloud,
  Play,
  CheckCircle2,
  FileCheck,
  Ban,
  Edit3,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Download,
  FileText,
  Trash2,
  Phone,
  Clock,
  Paperclip,
  Check,
  X,
} from "lucide-react";
import { env } from "../../../app/config/env";

const resolveImageUrl = (filePath?: string | null): string => {
  if (!filePath) return "";
  if (
    filePath.startsWith("http://") ||
    filePath.startsWith("https://") ||
    filePath.startsWith("data:")
  ) {
    return filePath;
  }
  const cleanPath = filePath.startsWith("/") ? filePath : `/${filePath}`;
  const serverRoot = env.API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  return `${serverRoot}${cleanPath}`;
};

interface FsrDetailPageProps {
  id?: string;
}

export const FsrDetailPage: React.FC<FsrDetailPageProps> = ({ id: propId }) => {
  const currentPath = useCurrentPath();
  const { user } = useAuthStore();
  const { addToast } = useNotificationStore();
  const queryClient = useQueryClient();

  // Extract ID
  const id = propId || currentPath.split("/")[2];

  // Modals state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCustomerSignOff, setShowCustomerSignOff] = useState(false);
  const [showFseSignOff, setShowFseSignOff] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<FsrAttachment | null>(null);

  // Confirmation dialogs
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Fetch single FSR
  const {
    data: fsrData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["fsr", id],
    queryFn: async () => {
      if (!id) throw new Error("Missing FSR ID");
      const res = await fieldService.getFsrById(id);
      return res.data;
    },
    enabled: !!id,
  });

  // Lifecycle Mutations
  const startMutation = useMutation({
    mutationFn: () => fieldService.startFsr(id),
    onSuccess: (data) => {
      addToast({
        type: "success",
        title: "Service Visit Started",
        message: `FSR ${data.data?.fsr.fsrNumber} is now IN_PROGRESS.`,
      });
      queryClient.invalidateQueries({ queryKey: ["fsr", id] });
      queryClient.invalidateQueries({ queryKey: ["fsr-activity", id] });
      queryClient.invalidateQueries({ queryKey: ["fsrs-list"] });
      queryClient.invalidateQueries({ queryKey: ["fsrs-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["my-fsr-visits"] });
    },
    onError: (err: any) => {
      addToast({
        type: "error",
        title: "Action Failed",
        message:
          err.response?.data?.error?.message || "Could not start service visit",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => fieldService.completeFsr(id),
    onSuccess: (data) => {
      addToast({
        type: "success",
        title: "Visit Completed",
        message: `FSR ${data.data?.fsr.fsrNumber} marked as COMPLETED.`,
      });
      queryClient.invalidateQueries({ queryKey: ["fsr", id] });
      queryClient.invalidateQueries({ queryKey: ["fsr-activity", id] });
      queryClient.invalidateQueries({ queryKey: ["fsrs-list"] });
      queryClient.invalidateQueries({ queryKey: ["fsrs-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["my-fsr-visits"] });
    },
    onError: (err: any) => {
      addToast({
        type: "error",
        title: "Action Failed",
        message:
          err.response?.data?.error?.message ||
          "Could not complete service visit",
      });
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => fieldService.closeFsr(id),
    onSuccess: (data) => {
      addToast({
        type: "success",
        title: "Report Closed",
        message: `FSR ${data.data?.fsr.fsrNumber} officially CLOSED.`,
      });
      queryClient.invalidateQueries({ queryKey: ["fsr", id] });
      queryClient.invalidateQueries({ queryKey: ["fsr-activity", id] });
      queryClient.invalidateQueries({ queryKey: ["fsrs-list"] });
      queryClient.invalidateQueries({ queryKey: ["fsrs-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["my-fsr-visits"] });
    },
    onError: (err: any) => {
      addToast({
        type: "error",
        title: "Action Failed",
        message: err.response?.data?.error?.message || "Could not close FSR",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => fieldService.cancelFsr(id, reason),
    onSuccess: (data) => {
      addToast({
        type: "info",
        title: "Report Cancelled",
        message: `FSR ${data.data?.fsr.fsrNumber} has been cancelled.`,
      });
      setConfirmCancelOpen(false);
      setCancelReason("");
      queryClient.invalidateQueries({ queryKey: ["fsr", id] });
      queryClient.invalidateQueries({ queryKey: ["fsr-activity", id] });
      queryClient.invalidateQueries({ queryKey: ["fsrs-list"] });
      queryClient.invalidateQueries({ queryKey: ["fsrs-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["my-fsr-visits"] });
    },
    onError: (err: any) => {
      addToast({
        type: "error",
        title: "Action Failed",
        message: err.response?.data?.error?.message || "Could not cancel FSR",
      });
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) =>
      fieldService.deleteAttachment(id, attachmentId),
    onSuccess: () => {
      addToast({
        type: "success",
        title: "Attachment Deleted",
        message: "Attachment has been removed from this report.",
      });
      queryClient.invalidateQueries({ queryKey: ["fsr", id] });
      queryClient.invalidateQueries({ queryKey: ["fsr-activity", id] });
    },
    onError: (err: any) => {
      addToast({
        type: "error",
        title: "Delete Failed",
        message:
          err.response?.data?.error?.message || "Could not delete attachment",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-24 text-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">
          Loading service report details...
        </p>
      </div>
    );
  }

  if (error || !fsrData) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center bg-white rounded-2xl border border-slate-200 shadow-sm mt-8">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900">
          Service Report Not Found
        </h2>
        <p className="text-xs text-slate-500 mt-1 mb-5">
          The requested report does not exist or you lack authorization to
          access it.
        </p>
        <button
          onClick={() => navigate("/field-service/reports")}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Service Reports
        </button>
      </div>
    );
  }

  const {
    fsr,
    customer,
    destination,
    product,
    serviceEngineer,
    siteObservation,
    batteryBanks,
    parts,
    attachments,
  } = fsrData;

  // Centralized Permissions
  const canEdit = canEditFsr(user, fsr);
  const canStart = canStartFsr(user, fsr);
  const canComplete = canCompleteFsr(user, fsr);
  const canClose = canCloseFsr(user, fsr);
  const canCancel = canCancelFsr(user, fsr);
  const canAssign = canAssignFse(user, fsr);
  const canSignCustomer = canSignFsr(user, fsr);
  const canSignFse = canSignFsr(user, fsr);
  const canUploadAttachment = canMutateAttachments(user, fsr);
  const canDownload = canDownloadFsr(user, fsr);

  const obs = siteObservation;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-20">
      {/* Top Breadcrumb & Quick Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate("/field-service/reports")}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to All Reports
        </button>

        {/* Action Button Strip */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* PDF Preview & Download Buttons */}
          {canDownload && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowPdfModal(true)}
                className="px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                title="Preview Official FSR PDF"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" /> Preview PDF
              </button>
              <button
                onClick={async () => {
                  try {
                    setIsDownloadingPdf(true);
                    await fieldService.downloadFsrPdf(fsr.id, fsr.fsrNumber);
                    addToast({
                      type: "success",
                      title: "PDF Downloaded",
                      message: `FSR ${fsr.fsrNumber} downloaded successfully.`,
                    });
                  } catch (err: any) {
                    addToast({
                      type: "error",
                      title: "Download Failed",
                      message:
                        err.response?.data?.error?.message ||
                        "Failed to download PDF report",
                    });
                  } finally {
                    setIsDownloadingPdf(false);
                  }
                }}
                disabled={isDownloadingPdf}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
                title="Download Official FSR PDF"
              >
                {isDownloadingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Download PDF</span>
              </button>
            </div>
          )}

          {/* Edit Button */}
          {canEdit && (
            <button
              onClick={() => navigate(`/field-service/${fsr.id}/edit`)}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-blue-500 text-slate-700 hover:text-blue-600 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Report
            </button>
          )}

          {/* Reassign (Admin/Manager) */}
          {canAssign && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-blue-500 text-slate-700 hover:text-blue-600 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" /> Reassign FSE
            </button>
          )}

          {/* Upload Attachment */}
          {canUploadAttachment && (
            <button
              onClick={() => setShowAttachmentModal(true)}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-blue-500 text-slate-700 hover:text-blue-600 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" /> Add Attachment
            </button>
          )}

          {/* Start Visit Button */}
          {canStart && (
            <button
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" /> Start Visit
            </button>
          )}

          {/* Complete Visit Button */}
          {canComplete && (
            <button
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Complete Visit
            </button>
          )}

          {/* Close Report Button (Admin) */}
          {canClose && (
            <button
              onClick={() => closeMutation.mutate()}
              disabled={closeMutation.isPending}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileCheck className="w-3.5 h-3.5" /> Close Report
            </button>
          )}

          {/* Cancel Report (Admin) */}
          {canCancel && (
            <button
              onClick={() => setConfirmCancelOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* MASTER REPORT BANNER / HEADER */}
      <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <span className="font-mono text-xl sm:text-2xl font-black text-slate-900">
              {fsr.fsrNumber}
            </span>
            <FsrStatusBadge status={fsr.status} />
            <FsrCallTypeBadge callType={fsr.callType} />
          </div>

          <h2 className="text-base sm:text-lg font-bold text-slate-800">
            {customer?.name || fsr.customerName}
          </h2>

          <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Visit Date: {new Date(fsr.visitDate).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Created: {new Date(fsr.createdAt).toLocaleString()}
            </span>
          </p>
        </div>

        {/* Assigned Engineer Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 min-w-[240px]">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Assigned Service Engineer
          </span>
          <p className="text-sm font-bold text-slate-900">
            {serviceEngineer?.fullName || fsr.fseName || "Unassigned"}
          </p>
          {(serviceEngineer?.phone || fsr.fseNumber) && (
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3" />{" "}
              {serviceEngineer?.phone || fsr.fseNumber}
            </p>
          )}
        </div>
      </div>

      {/* 2-COLUMN MAIN CONTENT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: SECTIONS 1 - 10 (2 COLS SPAN) */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION 1: CUSTOMER DETAILS */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
              <Building2 className="w-4 h-4 text-blue-600" />
              <h3>1. Customer & Site Details</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">
                  Customer Name
                </span>
                <span className="text-slate-900 font-semibold text-sm">
                  {customer?.name || fsr.customerName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">
                  Company Name
                </span>
                <span className="text-slate-800">
                  {customer?.companyName || fsr.companyName || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">
                  Site Destination / Address
                </span>
                <span className="text-slate-700">
                  {destination?.address ||
                    destination?.name ||
                    fsr.customerAddress ||
                    "Not specified"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">
                  Contact Phone
                </span>
                <span className="text-slate-700">
                  {customer?.phone || fsr.customerPhone || "Not specified"}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">
                  Problem Reported by Customer
                </span>
                <p className="text-slate-800 mt-0.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  {fsr.problemReported || "None specified"}
                </p>
              </div>

              {fsr.reasonForVisit && (
                <div>
                  <span className="text-slate-400 block font-medium">
                    Reason for Visit / Scope
                  </span>
                  <p className="text-slate-800 mt-0.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    {fsr.reasonForVisit}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: PRODUCT / UPS SPECIFICATIONS */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
              <Cpu className="w-4 h-4 text-purple-600" />
              <h3>2. Product / UPS Specifications</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">
                  Product Model
                </span>
                <span className="text-slate-900 font-bold text-sm">
                  {fsr.productModel || product?.name || "UPS"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">
                  Make / Brand
                </span>
                <span className="text-slate-900 font-semibold">
                  {fsr.productMake || "TANEJA POWER"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">
                  Serial Number
                </span>
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                  {fsr.productSerialNumber || product?.sku || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">
                  Call Type
                </span>
                <span className="font-bold text-slate-800">{fsr.callType}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">
                  Equipment Status
                </span>
                <span className="font-semibold text-slate-800">
                  {fsr.equipmentStatus
                    ? fsr.equipmentStatus.replace("_", " ")
                    : "OPERATIONAL"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">
                  Warranty Status
                </span>
                <span className="font-semibold text-slate-800">
                  {fsr.warrantyStatus
                    ? fsr.warrantyStatus.replace("_", " ")
                    : "UNDER WARRANTY"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">
                  Billing Status
                </span>
                <span className="font-semibold text-slate-800">
                  {fsr.billingStatus
                    ? fsr.billingStatus.replace(/_/g, " ")
                    : "NON BILLABLE"}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: SITE OBSERVATIONS & ELECTRICAL READINGS */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
              <Activity className="w-4 h-4 text-blue-600" />
              <h3>3. Site Observations & Electrical Measurements</h3>
            </div>

            {obs ? (
              <div className="space-y-4 text-xs">
                {/* Electrical Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div>
                    <span className="text-slate-400 block">Input on Mains</span>
                    <span className="font-bold text-slate-900">
                      {obs.inputOnMains || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">
                      Input Voltage (L-N)
                    </span>
                    <span className="font-bold text-slate-900">
                      {obs.inputVoltageLN || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">
                      Input Voltage (L-L)
                    </span>
                    <span className="font-bold text-slate-900">
                      {obs.inputVoltageLL || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">
                      Output Voltage (L-N)
                    </span>
                    <span className="font-bold text-slate-900">
                      {obs.outputVoltageLN || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">
                      Output Voltage (L-L)
                    </span>
                    <span className="font-bold text-slate-900">
                      {obs.outputVoltageLL || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">VAC</span>
                    <span className="font-bold text-slate-900">
                      {obs.vac || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">
                      Input Frequency
                    </span>
                    <span className="font-bold text-slate-900">
                      {obs.inputFrequency || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">
                      Output Frequency
                    </span>
                    <span className="font-bold text-slate-900">
                      {obs.outputFrequency || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">DC Voltage</span>
                    <span className="font-bold text-slate-900">
                      {obs.dcVoltage || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Output Load %</span>
                    <span className="font-bold text-slate-900">
                      {obs.outputLoadPercent || "—"}
                    </span>
                  </div>
                </div>

                {/* Location & Room condition */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block">
                      Room Environment Condition
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      {obs.environmentCondition === "YES" ||
                      obs.environmentCondition === "Good" ||
                      obs.environmentCondition === "true" ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                          Satisfactory / Good
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold">
                          {obs.environmentCondition || "Normal"}
                        </span>
                      )}
                      {obs.environmentRemarks && (
                        <span className="text-slate-500">
                          ({obs.environmentRemarks})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block">
                      UPS Room Location
                    </span>
                    <span className="font-bold text-slate-900 mt-1 block">
                      {obs.upsLocation
                        ? obs.upsLocation.replace("_", " ")
                        : "COMPUTER ROOM"}
                      {obs.otherLocationSpecification
                        ? ` (${obs.otherLocationSpecification})`
                        : ""}
                    </span>
                  </div>
                </div>

                {obs.observationsNotes && (
                  <div>
                    <span className="text-slate-400 block font-medium mb-1">
                      Observation Notes
                    </span>
                    <p className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-800 leading-relaxed">
                      {obs.observationsNotes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No site observations recorded yet.
              </p>
            )}
          </div>

          {/* SECTION 4: BATTERY BANKS & DYNAMIC CELL READINGS */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
                <BatteryCharging className="w-4 h-4 text-emerald-600" />
                <h3>
                  4. Battery Bank Records ({batteryBanks?.length || 0} Banks)
                </h3>
              </div>
            </div>

            {!batteryBanks || batteryBanks.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No battery banks recorded for this report.
              </p>
            ) : (
              <div className="space-y-5">
                {batteryBanks.map((bank, bIdx) => (
                  <div
                    key={bank.id || bIdx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                      <span className="font-bold text-sm text-slate-900">
                        Bank #{bank.bankNumber}:{" "}
                        {bank.bankDescription || `Bank ${bank.bankNumber}`}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                        {bank.quantity} Cells • {bank.ah || "N/A"} •{" "}
                        {bank.voltage || "N/A"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block">Make</span>
                        <span className="font-semibold text-slate-800">
                          {bank.make || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">
                          Charging Current
                        </span>
                        <span className="font-semibold text-slate-800">
                          {bank.chargingCurrent || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">
                          Discharging Current
                        </span>
                        <span className="font-semibold text-slate-800">
                          {bank.dischargingCurrent || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">
                          Front Indication
                        </span>
                        <span className="font-semibold text-slate-800">
                          {bank.frontIndication || "—"}
                        </span>
                      </div>
                    </div>

                    {/* Cell Readings Table */}
                    {bank.readings && bank.readings.length > 0 && (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-72">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100 text-slate-600 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 font-bold w-14 text-center">
                                Cell #
                              </th>
                              <th className="px-3 py-2 font-semibold">
                                Charging Voltage
                              </th>
                              <th className="px-3 py-2 font-semibold">
                                Discharging Voltage
                              </th>
                              <th className="px-3 py-2 font-semibold">
                                Resistance
                              </th>
                              <th className="px-3 py-2 font-semibold">
                                Remarks
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {bank.readings.map((r, rIdx) => (
                              <tr
                                key={r.id || rIdx}
                                className="hover:bg-slate-50 transition-colors"
                              >
                                <td className="px-3 py-1.5 text-center font-bold text-slate-500">
                                  {r.batteryNumber}
                                </td>
                                <td className="px-3 py-1.5 text-slate-800 font-mono">
                                  {r.chargingVoltage || "—"}
                                </td>
                                <td className="px-3 py-1.5 text-slate-800 font-mono">
                                  {r.dischargingVoltage || "—"}
                                </td>
                                <td className="px-3 py-1.5 text-slate-800 font-mono">
                                  {r.internalResistance || "—"}
                                </td>
                                <td className="px-3 py-1.5 text-slate-600">
                                  {r.remarks || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 5: PART REPLACEMENT */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
              <Wrench className="w-4 h-4 text-rose-500" />
              <h3>5. Parts Replaced ({parts?.length || 0})</h3>
            </div>

            {!parts || parts.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No parts replaced during this visit.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                    <tr>
                      <th className="px-4 py-2.5">Part Name</th>
                      <th className="px-3 py-2.5">Part / S/N</th>
                      <th className="px-3 py-2.5">Qty</th>
                      <th className="px-3 py-2.5">Old Part Status</th>
                      <th className="px-3 py-2.5">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parts.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-bold text-slate-900">
                          {p.partName}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-700">
                          {p.partNumber || "—"}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-slate-800">
                          {p.quantity}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                            {p.oldPartStatus
                              ? p.oldPartStatus.replace(/_/g, " ")
                              : "DEFECTIVE RETURNED"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-500">
                          {p.remarks || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 6: STANDBY, CHARGES & FEEDBACK */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <h3>6. Standby, Charges & Feedback</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">
                  Standby Equipment
                </span>
                <span className="font-semibold text-slate-800">
                  {fsr.standbyDetails || "None provided"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">
                  Service Charges
                </span>
                <span className="font-black text-sm text-emerald-600">
                  {fsr.charges
                    ? `₹ ${parseFloat(String(fsr.charges)).toLocaleString()}`
                    : "₹ 0.00"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">
                  Charges Remarks
                </span>
                <span className="text-slate-700">
                  {fsr.chargesRemarks || "—"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block font-medium mb-1">
                  FSE Feedback & Suggestions
                </span>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-800">
                  {fsr.fseFeedback || "No feedback entered"}
                </p>
              </div>
              <div>
                <span className="text-slate-400 block font-medium mb-1">
                  Customer Feedback
                </span>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-800">
                  {fsr.customerFeedback || "No feedback entered"}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 7: ATTACHMENTS GALLERY */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
                <Paperclip className="w-4 h-4 text-blue-600" />
                <h3>7. Report Attachments ({attachments?.length || 0})</h3>
              </div>

              {fsr.status !== "CLOSED" && fsr.status !== "CANCELLED" && (
                <button
                  onClick={() => setShowAttachmentModal(true)}
                  className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" /> Upload File
                </button>
              )}
            </div>

            {!attachments || attachments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No photos or documents attached yet.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between group overflow-hidden"
                  >
                    <div className="space-y-1.5">
                      {att.filePath.startsWith("data:image") ||
                      att.filePath.endsWith(".png") ||
                      att.filePath.endsWith(".jpg") ? (
                        <img
                          src={resolveImageUrl(att.filePath)}
                          alt={att.fileName}
                          className="w-full h-24 object-cover rounded-lg border border-slate-200 cursor-pointer"
                          onClick={() => setPreviewAttachment(att)}
                        />
                      ) : (
                        <div className="w-full h-24 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                          <Paperclip className="w-8 h-8" />
                        </div>
                      )}

                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block truncate">
                        {att.category.replace(/_/g, " ")}
                      </span>

                      <p
                        className="text-xs font-medium text-slate-900 truncate"
                        title={att.fileName}
                      >
                        {att.fileName}
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 mt-2 pt-2 border-t border-slate-200/80">
                      <a
                        href={att.filePath}
                        download={att.fileName}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>

                      {canDeleteAttachment(user, fsr, att) && (
                        <button
                          onClick={() =>
                            deleteAttachmentMutation.mutate(att.id)
                          }
                          className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SIGN-OFFS & TIMELINE (1 COL SPAN) */}
        <div className="space-y-6">
          {/* CUSTOMER SIGN-OFF CARD */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <h3>Customer Sign-Off</h3>
              </div>

              {fsr.customerSignature ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px] flex items-center gap-1">
                  <Check className="w-3 h-3" /> Signed
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px]">
                  Pending
                </span>
              )}
            </div>

            {fsr.customerSignature ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Contact Name</span>
                  <span className="font-bold text-slate-900">
                    {fsr.customerContactName ||
                      customer?.name ||
                      "Customer Representative"}
                  </span>
                </div>

                {fsr.customerSignedAt && (
                  <div>
                    <span className="text-slate-400 block">Signed Date</span>
                    <span className="text-slate-700">
                      {new Date(fsr.customerSignedAt).toLocaleString()}
                    </span>
                  </div>
                )}

                {fsr.customerSignature && (
                  <div>
                    <span className="text-slate-400 block mb-1">
                      Customer Signature
                    </span>
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <img
                        src={resolveImageUrl(fsr.customerSignature)}
                        alt="Customer Signature"
                        className="max-h-24 mx-auto object-contain"
                      />
                    </div>
                  </div>
                )}

                {fsr.customerStamp && (
                  <div>
                    <span className="text-slate-400 block mb-1">
                      Customer Stamp
                    </span>
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <img
                        src={resolveImageUrl(fsr.customerStamp)}
                        alt="Customer Stamp"
                        className="max-h-24 mx-auto object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 space-y-3">
                <p className="text-xs text-slate-400">
                  Customer has not digitally signed or stamped this service
                  report.
                </p>
                {canSignCustomer && (
                  <button
                    onClick={() => setShowCustomerSignOff(true)}
                    className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileCheck2 className="w-4 h-4" /> Collect Customer Sign-Off
                  </button>
                )}
              </div>
            )}
          </div>

          {/* FSE SIGN-OFF CARD */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <h3>FSE Sign-Off</h3>
              </div>

              {fsr.fseSignature ? (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px] flex items-center gap-1">
                  <Check className="w-3 h-3" /> Signed
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px]">
                  Pending
                </span>
              )}
            </div>

            {fsr.fseSignature ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Service Engineer</span>
                  <span className="font-bold text-slate-900">
                    {fsr.fseName ||
                      serviceEngineer?.fullName ||
                      "Field Engineer"}
                  </span>
                </div>

                {fsr.fseSignatureDate && (
                  <div>
                    <span className="text-slate-400 block">Signed Date</span>
                    <span className="text-slate-700">
                      {new Date(fsr.fseSignatureDate).toLocaleString()}
                    </span>
                  </div>
                )}

                {fsr.fseSignature && (
                  <div>
                    <span className="text-slate-400 block mb-1">
                      Engineer Signature
                    </span>
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <img
                        src={resolveImageUrl(fsr.fseSignature)}
                        alt="FSE Signature"
                        className="max-h-24 mx-auto object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 space-y-3">
                <p className="text-xs text-slate-400">
                  Field Engineer signature pending completion.
                </p>
                {canSignFse && (
                  <button
                    onClick={() => setShowFseSignOff(true)}
                    className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" /> Sign as Service Engineer
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ACTIVITY TIMELINE */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
              <Clock className="w-4 h-4 text-slate-500" />
              <h3>Activity & Audit Stream</h3>
            </div>

            <FsrActivityTimeline fsrId={fsr.id} />
          </div>
        </div>
      </div>

      {/* REASSIGN MODAL */}
      {showAssignModal && (
        <FsrAssignModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          fsrId={fsr.id}
          currentEngineerId={fsr.serviceEngineerId || undefined}
          currentEngineerName={
            serviceEngineer?.fullName || fsr.fseName || undefined
          }
        />
      )}

      {/* CUSTOMER SIGN-OFF MODAL */}
      {showCustomerSignOff && (
        <FsrSignOffModal
          isOpen={showCustomerSignOff}
          onClose={() => setShowCustomerSignOff(false)}
          fsrId={fsr.id}
          signType="CUSTOMER"
          initialContactName={
            fsr.customerContactName || customer?.name || undefined
          }
        />
      )}

      {/* FSE SIGN-OFF MODAL */}
      {showFseSignOff && (
        <FsrSignOffModal
          isOpen={showFseSignOff}
          onClose={() => setShowFseSignOff(false)}
          fsrId={fsr.id}
          signType="FSE"
          fseName={serviceEngineer?.fullName || user?.fullName || undefined}
          fsePhone={serviceEngineer?.phone || undefined}
        />
      )}

      {/* ATTACHMENT UPLOAD MODAL */}
      {showAttachmentModal && (
        <FsrAttachmentModal
          isOpen={showAttachmentModal}
          onClose={() => setShowAttachmentModal(false)}
          fsrId={fsr.id}
        />
      )}

      {/* IMAGE PREVIEW MODAL */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
          onClick={() => setPreviewAttachment(null)}
        >
          <div className="max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white p-2 relative shadow-2xl">
            <button
              onClick={() => setPreviewAttachment(null)}
              className="absolute top-4 right-4 p-2 bg-slate-900/60 rounded-full text-white hover:bg-slate-900 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={resolveImageUrl(previewAttachment.filePath)}
              alt={previewAttachment.fileName}
              className="max-h-[80vh] w-auto mx-auto rounded-lg object-contain"
            />
            <p className="text-center text-xs text-slate-700 mt-2 font-medium">
              {previewAttachment.fileName} ({previewAttachment.category})
            </p>
          </div>
        </div>
      )}

      {/* PDF PREVIEW & DOWNLOAD MODAL */}
      <FsrPdfModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        fsrData={fsrData}
      />

      {/* CANCEL CONFIRMATION DIALOG */}
      {confirmCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <Ban className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">
                Cancel Service Report?
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Are you sure you want to cancel FSR {fsr.fsrNumber}? This will
              lock further edits and mark the visit as cancelled.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for cancellation
              </label>
              <input
                type="text"
                placeholder="e.g. Site rescheduled by client"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setConfirmCancelOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={() => cancelMutation.mutate(cancelReason)}
                disabled={cancelMutation.isPending}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
