import { useMemo } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../i18n';
import { getIcon } from '../../assets/icons';

interface Suggestion {
  icon: string;
  title: string;
  description: string;
  prompt: string;
}

const defaultSuggestions: Suggestion[] = [
  {
    icon: 'trendingUp',
    title: 'Sales Trend Analysis',
    description: 'Query recent 7-day sales trends and compare with prior period',
    prompt: '查询最近7天的销售趋势，并与上个月同期对比分析',
  },
  {
    icon: 'dollarSign',
    title: 'GMV Analysis',
    description: 'Analyze GMV month-over-month changes by product line',
    prompt: '分析各产品线的GMV环比变化，找出增长最快和下滑最严重的品类',
  },
  {
    icon: 'percent',
    title: 'User Retention',
    description: 'Find categories where repurchase rate dropped over 20%',
    prompt: '找出复购率下降超过20%的品类，并分析可能的原因',
  },
  {
    icon: 'fileSearch',
    title: 'Channel Report',
    description: 'Generate Q3 channel analysis with key metrics',
    prompt: '生成Q3各渠道的收入、订单量、客单价分析报告',
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function WelcomePanel({ onSuggestionClick }: {
  onSuggestionClick: (prompt: string) => void;
}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const greeting = useMemo(getGreeting, []);

  const displayName = user?.username || user?.nickname || 'analyst';

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-full px-6 py-12"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
    >
      {/* Greeting */}
      <div className="mb-10 text-center">
        <h1
          style={{
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            fontWeight: 600,
            color: 'var(--color-ink)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            marginBottom: '8px',
          }}
        >
          {greeting}, {displayName}
        </h1>
        <p
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-ink-secondary)',
            letterSpacing: '-0.01em',
            lineHeight: 1.5,
          }}
        >
          How can I help you analyze your data today?
        </p>
      </div>

      {/* Suggestion cards */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full"
        style={{ maxWidth: '600px' }}
      >
        {defaultSuggestions.map((item, i) => {
          const Icon = getIcon(item.icon);
          return (
            <motion.button
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 + i * 0.06, ease: [0.33, 1, 0.68, 1] }}
              onClick={() => onSuggestionClick(item.prompt)}
              className="panel-clickable text-left p-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}
                >
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <div
                    className="mb-0.5"
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--color-ink)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 400,
                      color: 'var(--color-ink-secondary)',
                      lineHeight: 1.5,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {item.description}
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Footer */}
      <p
        className="mt-10 select-none"
        style={{
          fontSize: '10.5px',
          fontWeight: 400,
          color: 'var(--color-ink-tertiary)',
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          letterSpacing: '0.02em',
        }}
      >
        Powered by SQL-Logic-Engine Multi-Agent System
      </p>
    </motion.div>
  );
}
