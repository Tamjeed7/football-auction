import React, { useEffect, useRef, useState } from 'react';
import { X, Upload } from 'lucide-react';
import { Player } from '../types';
import { validateUploadFile, savePortrait, deletePortrait } from '../lib/portraitStore';
import { usePortraitUrl } from '../hooks/usePortraitUrl';

interface PortraitUploadModalProps {
  player: Player;
  onClose: () => void;
  onSaved: (assetId: string) => void;
  onReset: () => void;
}

export function PortraitUploadModal({ player, onClose, onSaved, onReset }: PortraitUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const currentUrl = usePortraitUrl(player.customPortraitAssetId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!previewFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(previewFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [previewFile]);

  const handleFile = (file: File | undefined) => {
    setError(null);
    if (!file) return;
    const check = validateUploadFile(file);
    if (!check.ok) {
      setError(check.reason || 'This file cannot be used.');
      return;
    }
    setPreviewFile(file);
  };

  const handleConfirm = async () => {
    if (!previewFile) return;
    setSaving(true);
    try {
      const previousAssetId = player.customPortraitAssetId;
      const asset = await savePortrait(player.id, previewFile);
      onSaved(asset.assetId);
      if (previousAssetId) await deletePortrait(previousAssetId);
      onClose();
    } catch {
      setError('Could not save this image. Please try a different file.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (player.customPortraitAssetId) await deletePortrait(player.customPortraitAssetId);
    onReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[rgba(11,18,16,0.5)] backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="ledger-card w-full max-w-sm overflow-hidden">
        <div className="ledger-card-head">
          <div>
            <h2 className="text-lg font-semibold text-ink">Edit portrait</h2>
            <p className="ledger-tag mt-1">{player.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[rgba(0,0,0,0.06)] rounded-md text-ink-faint hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col items-center gap-4">
          <div className="w-32 h-32 rounded-md overflow-hidden border border-rule bg-paper flex items-center justify-center">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : currentUrl ? (
              <img src={currentUrl} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-ink-faint text-xs">No photo</span>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0])}
          />
          <button className="btn btn-secondary w-full" style={{ padding: '11px' }} onClick={() => fileInputRef.current?.click()}>
            <Upload size={15} /> Choose photo
          </button>
          <p className="text-[11px] text-ink-faint text-center">PNG, JPEG, or WEBP, under 5MB. Only upload photos you have the right to use — other managers may be able to see it.</p>

          {error && <p className="text-xs font-semibold text-red">{error}</p>}

          <div className="flex gap-2 w-full mt-1">
            {player.customPortraitAssetId && (
              <button className="btn btn-ghost flex-1" style={{ padding: '10px' }} onClick={handleReset}>
                Reset to default
              </button>
            )}
            <button
              className="btn btn-primary flex-1"
              style={{ padding: '10px' }}
              disabled={!previewFile || saving}
              onClick={handleConfirm}
            >
              {saving ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
