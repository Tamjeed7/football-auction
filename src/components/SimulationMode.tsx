import React, { useState } from 'react';
import { X, Download, Play } from 'lucide-react';
import { PLAYERS } from '../data/players';
import { formatMoney } from '../utils/format';
import {
  Difficulty,
  SimulationConfig,
  BatchSimulationReport,
  defaultSimulationConfig,
  runBatchSimulation
} from '../lib/auctionEngine';

interface SimulationModeProps {
  onClose: () => void;
}

const DIFFICULTIES: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];
const AGGRESSIVENESS_OPTIONS = [
  { label: 'Low', value: 0.6 },
  { label: 'Normal', value: 1.0 },
  { label: 'High', value: 1.6 }
];
const POOL_OPTIONS = [
  { label: 'Quick (50)', value: 50 },
  { label: 'Standard (100)', value: 100 },
  { label: 'Full', value: PLAYERS.length }
];
const BATCH_OPTIONS = [1, 5, 20];
// Batch runs above this execute on the main thread with no yielding — kept
// small deliberately. A production build with larger batches should move
// runBatchSimulation into a Web Worker instead of raising this cap.
const MAX_BATCH_RUNS = 20;

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SimulationMode({ onClose }: SimulationModeProps) {
  const [config, setConfig] = useState<SimulationConfig>(defaultSimulationConfig());
  const [seedInput, setSeedInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<BatchSimulationReport | null>(null);

  const runSimulation = () => {
    setIsRunning(true);
    setReport(null);
    // Defer one tick so the "Running..." state actually paints before the
    // (synchronous) computation blocks the main thread.
    setTimeout(() => {
      const finalConfig: SimulationConfig = {
        ...config,
        batchRuns: Math.min(config.batchRuns, MAX_BATCH_RUNS),
        seed: seedInput.trim() ? parseInt(seedInput.trim(), 10) : undefined
      };
      const result = runBatchSimulation(PLAYERS, finalConfig);
      setReport(result);
      setIsRunning(false);
    }, 30);
  };

  const singleRun = report && report.runs.length === 1 ? report.runs[0] : null;

  return (
    <div className="fixed inset-0 bg-[rgba(11,18,16,0.5)] backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="ledger-card w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="ledger-card-head shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-ink">Simulate Draft</h2>
            <p className="ledger-tag mt-1">Runs entirely offline — no real auction, no cloud save touched</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[rgba(0,0,0,0.06)] rounded-md transition-colors text-ink-faint hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {!report && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <div className="ledger-tag mb-1.5">Number of managers</div>
                  <div className="segmented">
                    {[2, 4, 6, 8].map(n => (
                      <button key={n} className={config.numBidders === n ? 'active' : ''} onClick={() => setConfig(c => ({ ...c, numBidders: n }))}>{n}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="ledger-tag mb-1.5">AI difficulty</div>
                  <div className="segmented">
                    {DIFFICULTIES.map(d => (
                      <button key={d} className={config.aiDifficulty === d ? 'active' : ''} onClick={() => setConfig(c => ({ ...c, aiDifficulty: d }))}>
                        {d.charAt(0) + d.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="ledger-tag mb-1.5">Bidding aggressiveness</div>
                  <div className="segmented">
                    {AGGRESSIVENESS_OPTIONS.map(o => (
                      <button key={o.label} className={config.biddingAggressiveness === o.value ? 'active' : ''} onClick={() => setConfig(c => ({ ...c, biddingAggressiveness: o.value }))}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="ledger-tag mb-1.5">Player pool</div>
                  <div className="segmented">
                    {POOL_OPTIONS.map(o => (
                      <button key={o.label} className={config.poolSize === o.value ? 'active' : ''} onClick={() => setConfig(c => ({ ...c, poolSize: o.value }))}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="ledger-tag mb-1.5">Batch runs</div>
                  <div className="segmented">
                    {BATCH_OPTIONS.map(n => (
                      <button key={n} className={config.batchRuns === n ? 'active' : ''} onClick={() => setConfig(c => ({ ...c, batchRuns: n }))}>{n}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="ledger-tag mb-1.5">Seed (optional, for reproducibility)</div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={seedInput}
                    onChange={e => setSeedInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="random"
                    className="field-input w-full"
                  />
                </div>
              </div>

              <button onClick={runSimulation} disabled={isRunning} className="btn btn-primary w-full" style={{ padding: 14 }}>
                <Play size={15} /> {isRunning ? 'Running…' : `Run ${config.batchRuns > 1 ? `${config.batchRuns} simulations` : 'simulation'}`}
              </button>
            </>
          )}

          {report && singleRun && (
            <div className="space-y-4">
              <div className="ledger-tag">Seed {report.seed} · {singleRun.log.length} lots resolved</div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-rule">
                    <th className="text-left py-2 ledger-tag">Manager</th>
                    <th className="text-right py-2 ledger-tag">Squad</th>
                    <th className="text-right py-2 ledger-tag">Avg OVR</th>
                    <th className="text-right py-2 ledger-tag">Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {[...singleRun.bidders]
                    .sort((a, b) => b.team.reduce((s, p) => s + p.overall, 0) - a.team.reduce((s, p) => s + p.overall, 0))
                    .map(b => (
                      <tr key={b.id} className="border-b border-rule">
                        <td className="py-2 font-semibold text-ink">{b.name}</td>
                        <td className="py-2 text-right font-mono tabular-nums">{b.team.length}/23</td>
                        <td className="py-2 text-right font-mono tabular-nums text-gold-strong font-bold">
                          {b.team.length ? (b.team.reduce((s, p) => s + p.overall, 0) / b.team.length).toFixed(1) : '0'}
                        </td>
                        <td className="py-2 text-right font-mono tabular-nums text-green-strong">{formatMoney(config.startingBudget - b.budget)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {report && !singleRun && (
            <div className="space-y-4">
              <div className="ledger-tag">{report.runs.length} runs · base seed {report.seed}</div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-rule">
                    <th className="text-left py-2 ledger-tag">Manager</th>
                    <th className="text-right py-2 ledger-tag">Win rate</th>
                    <th className="text-right py-2 ledger-tag">Avg OVR</th>
                    <th className="text-right py-2 ledger-tag">Avg spend</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(report.aggregate.winRateByBidder).map(id => {
                    const name = report.runs[0].bidders.find(b => b.id === id)?.name || id;
                    return (
                      <tr key={id} className="border-b border-rule">
                        <td className="py-2 font-semibold text-ink">{name}</td>
                        <td className="py-2 text-right font-mono tabular-nums text-gold-strong font-bold">{Math.round(report.aggregate.winRateByBidder[id] * 100)}%</td>
                        <td className="py-2 text-right font-mono tabular-nums">{report.aggregate.avgFinalOvrByBidder[id].toFixed(1)}</td>
                        <td className="py-2 text-right font-mono tabular-nums text-green-strong">{formatMoney(report.aggregate.avgSpendByBidder[id])}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {report && (
          <div className="p-5 border-t border-rule shrink-0 flex justify-end gap-3">
            <button onClick={() => setReport(null)} className="btn btn-ghost" style={{ padding: '11px 18px' }}>
              Run another
            </button>
            <button onClick={() => downloadJson(`simulation-${report.seed}.json`, report)} className="btn btn-secondary" style={{ padding: '11px 18px' }}>
              <Download size={14} /> Export JSON
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
