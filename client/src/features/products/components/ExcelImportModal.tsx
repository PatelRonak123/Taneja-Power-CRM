import React, { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Server,
  Layers,
  ShieldCheck,
  PackageCheck,
  X,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { productService } from '../services/productService';
import { ExcelImportResult } from '../types/product.types';
import { useNotificationStore } from '@/stores/notificationStore';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();

  const [importSource, setImportSource] = useState<'upload' | 'server'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'upsert' | 'skip_existing'>('upsert');
  const [isDryRun, setIsDryRun] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<ExcelImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    setImportResult(null);
    setErrorMessage(null);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setErrorMessage('Please select a valid Excel spreadsheet (.xlsx or .xls)');
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
      setImportResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setErrorMessage('Please select a valid Excel spreadsheet (.xlsx or .xls)');
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
      setImportResult(null);
    }
  };

  const handleExecuteImport = async () => {
    setErrorMessage(null);
    setImportResult(null);
    setIsLoading(true);

    try {
      let res;
      if (importSource === 'upload') {
        if (!selectedFile) {
          setErrorMessage('Please select an Excel file to import.');
          setIsLoading(false);
          return;
        }

        // Convert file to base64
        const reader = new FileReader();
        const base64Data = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(selectedFile);
        });

        res = await productService.importExcel({
          fileData: base64Data,
          fileName: selectedFile.name,
          mode,
          dryRun: isDryRun,
        });
      } else {
        // Seed from server master file (Taneja Power-1.xlsx)
        res = await productService.seedExcel({
          mode,
          dryRun: isDryRun,
        });
      }

      if (res && res.data) {
        setImportResult(res.data);
        if (!isDryRun) {
          queryClient.invalidateQueries({ queryKey: ['products'] });
          addToast({
            type: 'success',
            title: 'Catalogue Seeded Successfully',
            message: `Processed ${res.data.totalParsed} products (${res.data.insertedCount} new, ${res.data.updatedCount} updated)`,
          });
          if (onSuccess) onSuccess();
        } else {
          addToast({
            type: 'info',
            title: 'Dry Run Validation Completed',
            message: `Verified ${res.data.totalParsed} products without making database changes.`,
          });
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Import operation failed';
      setErrorMessage(msg);
      addToast({
        type: 'error',
        title: 'Import Failed',
        message: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      variant="dialog"
      maxWidth="xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shrink-0">
            <FileSpreadsheet size={20} />
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-semibold text-slate-900 leading-snug">
              Automated Excel Catalogue Importer
            </h2>
            <p className="text-xs text-slate-500 font-normal">
              Seed power equipment, inverters, batteries, and stabilizers directly from Excel
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck size={15} className="text-emerald-600" />
            <span>Multi-sheet schema parsing & 2-pass hierarchy guaranteed</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" onClick={handleClose} disabled={isLoading}>
              {importResult ? 'Done' : 'Cancel'}
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleExecuteImport}
              isLoading={isLoading}
              disabled={isLoading || (importSource === 'upload' && !selectedFile)}
              leftIcon={isDryRun ? <RotateCw size={16} /> : <PackageCheck size={16} />}
            >
              {isLoading
                ? 'Processing...'
                : isDryRun
                ? 'Run Validation (Dry Run)'
                : 'Seed Database Now'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5 py-1">
        {/* Source Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200/80">
          <button
            type="button"
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all ${
              importSource === 'upload'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => {
              setImportSource('upload');
              setErrorMessage(null);
            }}
          >
            <UploadCloud size={15} className={importSource === 'upload' ? 'text-blue-600' : ''} />
            <span>Upload Custom Excel File</span>
          </button>

          <button
            type="button"
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all ${
              importSource === 'server'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => {
              setImportSource('server');
              setErrorMessage(null);
            }}
          >
            <Server size={15} className={importSource === 'server' ? 'text-emerald-600' : ''} />
            <span>Use Server Master File (Taneja Power-1.xlsx)</span>
          </button>
        </div>

        {/* Source Details Panel */}
        {importSource === 'upload' ? (
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />

            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/40 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-center"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
                  <UploadCloud size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-800">
                    Click to browse or drag & drop Excel workbook
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5">
                    Supports Microsoft Excel (.xlsx, .xls) up to 25 MB
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900">
                      {selectedFile.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Ready for automated parsing
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-blue-100/60 rounded-md transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Server size={18} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-900">
                Production Master Workbook (Taneja Power-1.xlsx)
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                The server will automatically locate and parse the production Excel workbook from the repository root. Contains 8 vendor sheets (Hitachi, Vertiv, Eaton, Luminous, Microtek, Exide, Stabilizer).
              </p>
            </div>
          </div>
        )}

        {/* Configuration Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
          {/* Conflict Mode */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Existing Records Conflict Handling
            </label>
            <div className="flex flex-col gap-2 mt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                <input
                  type="radio"
                  name="conflictMode"
                  value="upsert"
                  checked={mode === 'upsert'}
                  onChange={() => setMode('upsert')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium">Upsert & Update Pricing</span>
                <span className="text-[11px] text-slate-500">(Recommended)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                <input
                  type="radio"
                  name="conflictMode"
                  value="skip_existing"
                  checked={mode === 'skip_existing'}
                  onChange={() => setMode('skip_existing')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium">Skip Existing Items</span>
                <span className="text-[11px] text-slate-500">(Only insert new SKUs)</span>
              </label>
            </div>
          </div>

          {/* Dry Run Toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Execution Safety
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={isDryRun}
                onChange={(e) => setIsDryRun(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-800">
                  Dry-Run Mode (Simulation only)
                </span>
                <span className="text-[11px] text-slate-500">
                  Parses and validates all sheets without writing any data to the database.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
            <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">Import Error</span>
              <span className="text-rose-700">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Success / Result Manifest View */}
        {importResult && (
          <div className="flex flex-col gap-3 p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <span className="text-sm font-semibold">
                  {importResult.dryRun ? 'Dry Run Validation Succeeded' : 'Import Executed Successfully'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                Batch: {importResult.batchId} ({importResult.durationMs}ms)
              </span>
            </div>

            {/* Metrics Chips */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-emerald-100 text-center">
                <span className="text-[11px] text-slate-500 block">Total Processed</span>
                <span className="text-lg font-bold text-slate-900">{importResult.totalParsed}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-emerald-100 text-center">
                <span className="text-[11px] text-emerald-600 font-medium block">Newly Added</span>
                <span className="text-lg font-bold text-emerald-700">{importResult.insertedCount}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-emerald-100 text-center">
                <span className="text-[11px] text-blue-600 font-medium block">Updated</span>
                <span className="text-lg font-bold text-blue-700">{importResult.updatedCount}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-emerald-100 text-center">
                <span className="text-[11px] text-slate-500 block">Skipped</span>
                <span className="text-lg font-bold text-slate-700">{importResult.skippedCount}</span>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-emerald-200/50">
              <span className="text-[11px] text-emerald-900 font-medium mr-1 flex items-center">
                <Layers size={13} className="mr-1" /> Categories:
              </span>
              {Object.entries(importResult.byCategory).map(([cat, count]) => (
                <span
                  key={cat}
                  className="px-2 py-0.5 bg-white text-slate-700 border border-emerald-200/60 rounded text-[11px]"
                >
                  {cat}: <strong>{count}</strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
