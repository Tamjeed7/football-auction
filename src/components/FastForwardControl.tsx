import React, { useState } from 'react';
import { FastForward, Square, ChevronDown } from 'lucide-react';
import { FastForwardConfig, FastForwardSpeed, Strategy, defaultFastForwardConfig } from '../lib/auctionEngine';
import { FastForwardActivityEntry } from '../hooks/useAuctionGame';
import { formatMoney } from '../utils/format';

interface FastForwardControlProps {
  active: boolean;
  config: FastForwardConfig;
  activityLog: FastForwardActivityEntry[];
  onStart: (config: FastForwardConfig) => void;
  onStop: () => void;
}

const STRATEGIES: Strategy[] = ['CAUTIOUS', 'BALANCED', 'AGGRESSIVE'];
const SPEEDS: FastForwardSpeed[] = ['2x', '4x', 'INSTANT'];
const SPEND_OPTIONS = [0.10, 0.15, 0.25];

export function FastForwardControl({ active, config, activityLog, onStart, onStop }: FastForwardControlProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [draft, setDraft] = useState<FastForwardConfig>(config);

  if (active) {
    return (
      <div className="flex items-center gap-2">
        <button onClick={onStop} className="btn btn-danger-outline" style={{ padding: '8px 12px', fontSize: 12.5 }}>
          <Square size={13} /> Stop Fast-Forward
        </button>
        {activityLog.length > 0 && (
          <div className="hidden md:flex items-center gap-2 text-xs text-ink-muted font-mono">
            <span className="ledger-tag" style={{ marginBottom: 0 }}>Last signed</span>
            <span className="text-ink font-semibold">{activityLog[0].playerName}</span>
            <span className="tabular-nums">{formatMoney(activityLog[0].amount)}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setDraft(config); setShowConfig(v => !v); }}
        className="btn btn-ghost"
        style={{ padding: '8px 12px', fontSize: 12.5 }}
      >
        <FastForward size={15} /> Fast-Forward <ChevronDown size={13} />
      </button>

      {showConfig && (
        <div className="ledger-card absolute right-0 top-full mt-2 z-40 p-4" style={{ width: 300 }}>
          <p className="text-xs text-ink-muted mb-3">
            Fast-Forward bids on your behalf up to the limits below. You can stop it at any time.
          </p>

          <div className="mb-3">
            <div className="ledger-tag mb-1.5">Strategy</div>
            <div className="segmented">
              {STRATEGIES.map(s => (
                <button key={s} className={draft.strategy === s ? 'active' : ''} onClick={() => setDraft(d => ({ ...d, strategy: s }))}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <div className="ledger-tag mb-1.5">Speed</div>
            <div className="segmented">
              {SPEEDS.map(s => (
                <button key={s} className={draft.speed === s ? 'active' : ''} onClick={() => setDraft(d => ({ ...d, speed: s }))}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <div className="ledger-tag mb-1.5">Max spend per lot</div>
            <div className="segmented">
              {SPEND_OPTIONS.map(pct => (
                <button key={pct} className={draft.maxSpendPerLotPct === pct ? 'active' : ''} onClick={() => setDraft(d => ({ ...d, maxSpendPerLotPct: pct }))}>
                  {Math.round(pct * 100)}%
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button className="btn btn-ghost flex-1" onClick={() => setShowConfig(false)} style={{ padding: '10px' }}>
              Cancel
            </button>
            <button
              className="btn btn-primary flex-1"
              style={{ padding: '10px' }}
              onClick={() => { onStart(draft); setShowConfig(false); }}
            >
              Start
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { defaultFastForwardConfig };
