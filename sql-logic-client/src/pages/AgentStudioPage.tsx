import { useState } from 'react';
import { Bot, Settings2, GitBranch, Cpu, BarChart3, Code2, Wrench, FileText, Zap } from 'lucide-react';
import ManagementPage from '../components/layout/ManagementPage';
import { workflowApi } from '../api/client';

const AGENTS = [
  { name: 'ManagerAgent', role: '编排管理者', goal: '路由用户请求、调度子Agent、管理人机交互', icon: GitBranch, color: '#5b7fd9', flowStep: 'START → Manager' },
  { name: 'PlannerAgent', role: '任务规划师', goal: '将复杂需求拆解为结构化子任务列表', icon: Settings2, color: '#5b8def', flowStep: 'Manager → Planner' },
  { name: 'DataScientistAgent', role: '数据科学家', goal: '生成方言感知SQL、执行查询、多候选投票、错误修复', icon: BarChart3, color: '#3ecf8e', flowStep: 'Planner → DataScientist' },
  { name: 'CodeAssistantAgent', role: '代码工程师', goal: '生成Python代码、Docker沙箱执行、LLM分析结果', icon: Code2, color: '#3ecf8e', flowStep: 'Planner → CodeAssistant' },
  { name: 'DashboardAssistantAgent', role: '报告生成者', goal: '汇总所有步骤结果、生成分析报告', icon: FileText, color: '#4dc9f6', flowStep: 'Workers → Dashboard' },
  { name: 'ToolAssistantAgent', role: '工具调用专家', goal: 'MCP工具调用、结果解析、失败修复', icon: Wrench, color: '#4dc9f6', flowStep: 'Planner → ToolAssistant' },
];

const ROUTING_MODES = [
  { key: 'SIMPLE', label: 'Simple Query', desc: 'Skip PlannerAgent, DataScientistAgent direct call', path: 'Manager → DataScientist' },
  { key: 'MEDIUM', label: 'Medium Complexity', desc: 'PlannerAgent → Workers → Dashboard', path: 'Manager → Planner → Workers → Dashboard' },
  { key: 'COMPLEX', label: 'Complex Analysis', desc: 'Full orchestration with multi-candidate SQL + parallel workers', path: 'Manager → Planner → Workers(parallel) → Dashboard' },
  { key: 'CLARIFY', label: 'Clarification Needed', desc: 'ManagerAgent asks user for clarification before proceeding', path: 'Manager → User(HITL) → Manager' },
];

export default function AgentStudioPage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string>('agents');

  return (
    <ManagementPage title="Agent Studio" icon={Bot}>
      <div className="flex flex-col gap-6 max-w-[900px]">
        {/* Architecture overview */}
        <section className="rounded-xl p-5" style={{ background: 'var(--color-panel-bg)', border: '1px solid var(--color-border-subtle)' }}>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-ink-tertiary)' }}>
            6-Agent Architecture — DB-GPT ConversableAgent Pattern
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-semibold" style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', color: 'var(--color-ink-secondary)' }}>
            <span style={{ color: '#5b7fd9' }}>START</span>
            <span>→</span>
            <span style={{ color: '#5b7fd9' }}>MANAGER</span>
            <span>→</span>
            <span className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(240,160,64,0.12)', color: '#f0a040' }}>ComplexityRouter</span>
            <span>→</span>
            <span className="flex items-center gap-0.5">
              <span style={{ color: '#3ecf8e' }}>{'{'}</span>
              <span style={{ color: '#5b8def' }}>PLANNER</span>
              <span>,</span>
              <span style={{ color: '#3ecf8e' }}>DATA_SCIENTIST</span>
              <span>,</span>
              <span style={{ color: '#3ecf8e' }}>CODE_ASSISTANT</span>
              <span>,</span>
              <span style={{ color: '#4dc9f6' }}>TOOL_ASSISTANT</span>
              <span style={{ color: '#3ecf8e' }}>{'}'}</span>
            </span>
            <span>→</span>
            <span style={{ color: '#4dc9f6' }}>DASHBOARD</span>
            <span>→</span>
            <span style={{ color: '#5b7fd9' }}>END</span>
          </div>
        </section>

        {/* Agent grid */}
        <section className="rounded-xl p-5" style={{ background: 'var(--color-panel-bg)', border: '1px solid var(--color-border-subtle)' }}>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-ink-tertiary)' }}>Agent Roles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AGENTS.map(agent => {
              const Icon = agent.icon;
              return (
                <div key={agent.name}
                  onClick={() => setSelectedAgent(selectedAgent === agent.name ? null : agent.name)}
                  className="rounded-lg p-4 cursor-pointer transition-colors"
                  style={{
                    background: selectedAgent === agent.name ? `${agent.color}10` : 'var(--color-app-bg)',
                    border: `1px solid ${selectedAgent === agent.name ? agent.color + '40' : 'var(--color-border-subtle)'}`,
                  }}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${agent.color}18` }}>
                      <Icon size={16} style={{ color: agent.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[13px] font-semibold" style={{ color: 'var(--color-ink)' }}>{agent.name}</h4>
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${agent.color}15`, color: agent.color }}>
                          {agent.role}
                        </span>
                      </div>
                      <p className="text-[11px] mt-1" style={{ color: 'var(--color-ink-tertiary)' }}>{agent.goal}</p>
                      <p className="text-[10px] mt-1.5" style={{ fontFamily: '"JetBrains Mono", monospace', color: 'var(--color-ink-tertiary)' }}>
                        {agent.flowStep}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Complexity Routing */}
        <section className="rounded-xl p-5" style={{ background: 'var(--color-panel-bg)', border: '1px solid var(--color-border-subtle)' }}>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-ink-tertiary)' }}>Complexity Routing — LLM-driven Adaptive Path</h3>
          <div className="grid grid-cols-2 gap-3">
            {ROUTING_MODES.map(mode => (
              <div key={mode.key} className="rounded-lg p-3" style={{ background: 'var(--color-app-bg)', border: '1px solid var(--color-border-subtle)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>{mode.key}</span>
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--color-ink)' }}>{mode.label}</span>
                </div>
                <p className="text-[11px] mb-1" style={{ color: 'var(--color-ink-tertiary)' }}>{mode.desc}</p>
                <p className="text-[10px]" style={{ fontFamily: '"JetBrains Mono", monospace', color: 'var(--color-ink-tertiary)' }}>
                  {mode.path}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[10px] mt-3" style={{ color: 'var(--color-ink-tertiary)' }}>
            The ComplexityRouter uses LLM to classify queries into SIMPLE/MEDIUM/COMPLEX/CLARIFY, selecting the optimal execution path.
            SIMPLE queries skip the PlannerAgent for faster response; COMPLEX queries use full multi-agent orchestration with parallel workers.
          </p>
        </section>

        {/* Phase 4 Features */}
        <section className="rounded-xl p-5" style={{ background: 'var(--color-panel-bg)', border: '1px solid var(--color-border-subtle)' }}>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-ink-tertiary)' }}>Advanced Features</h3>
          <div className="grid grid-cols-2 gap-3">
            <FeatureCard icon={Zap} title="Multi-Candidate SQL" desc="3 parallel LLM calls → rule filter → LLM rank → best SQL. 40% rule + 60% LLM composite scoring." />
            <FeatureCard icon={GitBranch} title="LLM Complexity Routing" desc="SIMPLE(fast) / MEDIUM(full) / COMPLEX(parallel) / CLARIFY(HITL). Default fallback: MEDIUM." />
            <FeatureCard icon={Settings2} title="Skill System" desc="3 built-in skills (sales-analysis, user-retention, anomaly-detection). Embedding-based semantic matching." />
            <FeatureCard icon={Bot} title="LLM Auto-Select Speaker" desc="TeamMixin.autoSelectSpeaker() — LLM picks the best agent for each task step." />
          </div>
        </section>

        {/* Integration note */}
        <section className="rounded-xl p-5" style={{ background: 'rgba(91,127,217,0.06)', border: '1px solid rgba(91,127,217,0.15)' }}>
          <div className="flex items-start gap-3">
            <GitBranch size={16} style={{ color: 'var(--color-primary)', marginTop: 1 }} />
            <div>
              <h4 className="text-[12px] font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>Flow Editor Integration</h4>
              <p className="text-[11px]" style={{ color: 'var(--color-ink-secondary)' }}>
                Define custom agent pipelines in the <a href="/flow-editor" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Flow Editor</a> — drag agent nodes, connect them, and execute directly. Flows can be saved as Apps in <a href="/app-builder" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>App Builder</a> for reusable agent configurations.
              </p>
            </div>
          </div>
        </section>
      </div>
    </ManagementPage>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--color-app-bg)', border: '1px solid var(--color-border-subtle)' }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} style={{ color: 'var(--color-primary)' }} />
        <span className="text-[12px] font-semibold" style={{ color: 'var(--color-ink)' }}>{title}</span>
      </div>
      <p className="text-[11px]" style={{ color: 'var(--color-ink-tertiary)' }}>{desc}</p>
    </div>
  );
}
