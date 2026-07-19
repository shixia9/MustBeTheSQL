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
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Terminal prompt header */}
      <div className="mb-8 text-center">
        <p className="font-mono text-sm text-on-surface-variant/60 mb-2">
          $ ssh {displayName}@sql-engine --welcome
        </p>
        <h1 className="font-mono text-2xl font-bold text-on-surface">
          <span className="text-[#a3e635]">$</span>{' '}
          {greeting}, <span className="text-[#38bdf8]">{displayName}</span>
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant font-mono">
          {t('welcome.subtitle') || 'How can I help you analyze your data today?'}
        </p>
      </div>

      {/* Suggestion cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-[640px]">
        {defaultSuggestions.map((item, i) => {
          const Icon = getIcon(item.icon);
          return (
            <motion.button
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.08, ease: 'easeOut' }}
              onClick={() => onSuggestionClick(item.prompt)}
              className="group text-left p-4 rounded border border-outline-variant bg-surface-container-lowest
                         hover:border-[#38bdf8]/40 hover:bg-surface-container-low
                         transition-all duration-200 card-hover"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0
                                bg-[#38bdf8]/10 text-[#38bdf8] group-hover:bg-[#38bdf8]/20 transition-colors">
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-on-surface mb-0.5 group-hover:text-[#38bdf8] transition-colors">
                    {t('welcome.suggestions.' + i + '.title') || item.title}
                  </div>
                  <div className="text-xs text-on-surface-variant leading-relaxed">
                    {t('welcome.suggestions.' + i + '.description') || item.description}
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Footer */}
      <p className="mt-8 text-[10px] text-on-surface-variant/40 font-mono">
        $ echo "Powered by SQL-Logic-Engine Multi-Agent System"
      </p>
    </motion.div>
  );
}
