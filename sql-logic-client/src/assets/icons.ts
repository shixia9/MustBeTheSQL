/**
 * Icon mapping registry — maps semantic icon names to Lucide React components.
 * Replace placeholder icons marked with TODO before production use.
 */
import {
  MessageSquare, BookOpen, Puzzle, Database, FileText, Plug, Clock,
  Cpu, Bot, Brain, History, Settings, User, PanelLeftClose, PanelLeftOpen,
  Play, Paperclip, AtSign, Circle, Loader, Check, X, ChevronDown,
  Sun, Moon, Languages, LogOut, Plus, Search, Trash2, Edit, Copy,
  ExternalLink, Upload, Download, RefreshCw, Zap, AlertTriangle,
  BarChart3, Table2, FileCode2, FileText as FileTextIcon,
  Globe, Server, Shield, Key, Wrench, FolderOpen, GitBranch,
  Terminal, type LucideIcon
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  // Navigation
  chat: MessageSquare,
  knowledge: BookOpen,
  skills: Puzzle,
  datasources: Database,
  prompts: FileText,
  connectors: Plug,
  scheduledTasks: Clock,
  models: Cpu,
  agentStudio: Bot,
  memory: Brain,
  history: History,
  settings: Settings,
  schemaBrowser: FolderOpen,
  workspace: Globe,

  // Actions
  play: Play,
  attach: Paperclip,
  mention: AtSign,
  newItem: Plus,
  search: Search,
  delete: Trash2,
  edit: Edit,
  copy: Copy,
  externalLink: ExternalLink,
  upload: Upload,
  download: Download,
  refresh: RefreshCw,

  // Status
  running: Loader,
  pending: Circle,
  success: Check,
  error: X,
  live: Zap,
  warning: AlertTriangle,

  // UI
  collapse: PanelLeftClose,
  expand: PanelLeftOpen,
  chevronDown: ChevronDown,
  sun: Sun,
  moon: Moon,
  languages: Languages,
  logout: LogOut,
  user: User,
  terminal: Terminal,
  server: Server,
  shield: Shield,
  key: Key,
  wrench: Wrench,
  gitBranch: GitBranch,

  // Output types
  chart: BarChart3,
  table: Table2,
  code: FileCode2,
  report: FileTextIcon,
};

export function getIcon(name: string): LucideIcon {
  return iconMap[name] || Circle;
}

export function hasIcon(name: string): boolean {
  return name in iconMap;
}

export default iconMap;
