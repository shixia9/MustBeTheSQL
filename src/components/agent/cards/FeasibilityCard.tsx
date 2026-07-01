import { CheckCircle2, AlertTriangle, MessageCircle } from 'lucide-react';

interface Props {
  result: string;
}

/**
 * Phase A2: renders the FEASIBILITY_ASSESSMENT verdict with a clear visual cue.
 * The backend verdicts are 《数据分析》 (analysis continue) / 《需要澄清》 (clarification)
 * / 《自由闲聊》 (free chat) — surfaced here with matching icons and accent colors.
 */
export default function FeasibilityCard({ result }: Props) {
  const text = String(result || '').trim();
  const isAnalysis = text.includes('《数据分析》');
  const isClarify = text.includes('《需要澄清》');
  const isChat = text.includes('《自由闲聊》');

  const Icon = isAnalysis ? CheckCircle2 : isClarify ? AlertTriangle : isChat ? MessageCircle : CheckCircle2;
  const accent = isAnalysis
    ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500'
    : isClarify
    ? 'border-amber-500/30 bg-amber-500/5 text-amber-500'
    : isChat
    ? 'border-blue-500/30 bg-blue-500/5 text-blue-500'
    : 'border-on-surface-variant/30 bg-surface-container-low text-on-surface-variant';

  return (
    <div className={`text-xs mt-1 px-2 py-1.5 rounded border flex items-start gap-2 ${accent}`}>
      <Icon size={14} className="flex-shrink-0 mt-0.5" />
      <pre className="whitespace-pre-wrap font-sans flex-1">{text || 'Assessment complete'}</pre>
    </div>
  );
}
