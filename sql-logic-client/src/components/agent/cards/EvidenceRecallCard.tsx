/**
 * EvidenceRecallCard — renders the Phase 5 RAG evidence (glossary + few-shot Q/A).
 * Falls back to the old italic single-line evidence text when structured arrays are absent.
 */
import type { EvidenceEntry, FaqEntry } from '../../../types/agent';
import { Sparkles, BarChart3 } from 'lucide-react';

interface Props {
  rewriteQuery?: string;
  evidence?: string;
  evidenceGlossary?: EvidenceEntry[];
  evidenceFaq?: FaqEntry[];
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(1, Math.max(0, score)) * 100;
  const hue = pct * 1.2; // 0% = red, 100% = green (~120°)
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1 rounded-full bg-outline-variant/30 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct.toFixed(0)}%`, backgroundColor: `hsl(${hue.toFixed(0)}, 60%, 50%)` }}
        />
      </div>
      <span className="text-[9px] text-on-surface-variant/50 tabular-nums">{score.toFixed(2)}</span>
    </div>
  );
}

export default function EvidenceRecallCard({ rewriteQuery, evidence, evidenceGlossary, evidenceFaq }: Props) {
  const hasGlossary = Array.isArray(evidenceGlossary) && evidenceGlossary.length > 0;
  const hasFaq = Array.isArray(evidenceFaq) && evidenceFaq.length > 0;
  const hasOldEvidence = evidence && evidence !== '' && evidence !== '无' && !hasGlossary && !hasFaq;

  return (
    <div className="pb-2">
      {/* Rewrite query */}
      {rewriteQuery && (
        <div className="text-on-surface-variant/70 text-xs mb-1.5">
          <span className="text-primary">$</span>{' '}
          <span className="break-words">{rewriteQuery}</span>
        </div>
      )}

      {/* Phase 5 structured glossary */}
      {hasGlossary && (
        <div className="mb-2">
          <div className="flex items-center gap-1 text-[10px] text-on-surface-variant/60 mb-1.5">
            <Sparkles size={11} />
            <span>Recalled Glossary Terms</span>
          </div>
          <div className="space-y-1.5">
            {evidenceGlossary!.map((entry, i) => (
              <div key={i} className="p-2 rounded bg-primary/5 border border-primary/15">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-medium text-primary">{entry.term || entry.description?.substring(0, 40)}</span>
                  <ScoreBar score={entry.score} />
                </div>
                {entry.description && (
                  <p className="text-[10px] text-on-surface-variant leading-relaxed">{entry.description}</p>
                )}
                {entry.synonyms && (
                  <p className="text-[9px] text-on-surface-variant/50 mt-0.5">
                    AKA: {entry.synonyms}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase 5 structured FAQ */}
      {hasFaq && (
        <div>
          <div className="flex items-center gap-1 text-[10px] text-on-surface-variant/60 mb-1.5">
            <BarChart3 size={11} />
            <span>Recalled Few-shot Examples</span>
          </div>
          <div className="space-y-1.5">
            {evidenceFaq!.map((faq, i) => (
              <div key={i} className="p-2 rounded bg-surface-container-low border border-outline-variant/20">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-medium text-on-surface">Q: {faq.question}</span>
                  <ScoreBar score={faq.score} />
                </div>
                <p className="text-[10px] text-on-surface-variant/70 leading-relaxed">
                  A: {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Old flat evidence — backward-compat for Phase 1 sessions */}
      {hasOldEvidence && (
        <div className="text-on-surface-variant/60 text-xs italic">{evidence}</div>
      )}
    </div>
  );
}