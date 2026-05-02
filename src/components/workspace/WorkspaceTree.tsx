import React, { useEffect, useState, MouseEvent } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { 
  ChevronRight, 
  ChevronDown, 
  Database, 
  Table, 
  LayoutTemplate, 
  Columns, 
  Key, 
  FileCode,
  FolderTree,
  Loader2,
  FileJson
} from 'lucide-react';

interface TreeNodeProps {
  id: string;
  name: string;
  type: 'schema' | 'tables_folder' | 'views_folder' | 'table' | 'view' | 'column' | 'index';
  icon: React.ReactNode;
  hasChildren?: boolean;
  loadChildren?: () => Promise<TreeNodeProps[]>;
  onDoubleClick?: () => void;
  onContextMenu?: (e: MouseEvent, node: TreeNodeProps) => void;
  level: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ id, name, type, icon, hasChildren, loadChildren, onDoubleClick, onContextMenu, level }) => {
  const { expandedKeys, toggleExpand } = useWorkspaceStore();
  const isExpanded = expandedKeys.has(id);
  const [children, setChildren] = useState<TreeNodeProps[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isExpanded && hasChildren && children.length === 0 && loadChildren) {
      setLoading(true);
      loadChildren().then(data => {
        setChildren(data);
        setLoading(false);
      });
    }
  }, [isExpanded, hasChildren, loadChildren, children.length]);

  return (
    <div>
      <div 
        className={`flex items-center py-1 px-2 hover:bg-surface-container-highest cursor-pointer text-sm text-on-surface-variant group rounded-md select-none`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          if (hasChildren) toggleExpand(id);
        }}
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => onContextMenu && onContextMenu(e, { id, name, type, icon, level })}
      >
        <span className="w-4 h-4 flex items-center justify-center mr-1">
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : hasChildren ? (
            isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
          ) : null}
        </span>
        <span className="w-4 h-4 flex items-center justify-center mr-2 text-primary">
          {icon}
        </span>
        <span className="truncate">{name}</span>
      </div>
      
      {isExpanded && hasChildren && children.length > 0 && (
        <div className="flex flex-col">
          {children.map(child => (
            <TreeNode key={child.id} {...child} level={level + 1} onContextMenu={onContextMenu} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function WorkspaceTree({ connectionId }: { connectionId: number }) {
  const [schemas, setSchemas] = useState<TreeNodeProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, node: TreeNodeProps | null} | null>(null);
  const { addTab } = useWorkspaceStore();

  useEffect(() => {
    const fetchSchemas = async () => {
      try {
        const res = await fetch(`/api/v1/workspace/schemas?connectionId=${connectionId}`);
        const json = await res.json();
        if (json.code === 200 && json.data) {
          const schemaNodes = json.data.map((s: any) => createSchemaNode(s.name, connectionId));
          setSchemas(schemaNodes);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSchemas();
  }, [connectionId]);

  const createSchemaNode = (schemaName: string, connId: number): TreeNodeProps => ({
    id: `schema-${schemaName}`,
    name: schemaName,
    type: 'schema',
    icon: <Database className="w-3.5 h-3.5" />,
    hasChildren: true,
    level: 0,
    loadChildren: async () => [
      {
        id: `tables-folder-${schemaName}`,
        name: 'Tables',
        type: 'tables_folder',
        icon: <FolderTree className="w-3.5 h-3.5" />,
        hasChildren: true,
        level: 1,
        loadChildren: async () => {
          const res = await fetch(`/api/v1/workspace/tables?connectionId=${connId}&schemaName=${schemaName}`);
          const json = await res.json();
          if (json.code !== 200 || !json.data) return [];
          return json.data
            .filter((t: any) => t.type === 'TABLE')
            .map((t: any) => createTableNode(schemaName, t.name, connId));
        }
      },
      {
        id: `views-folder-${schemaName}`,
        name: 'Views',
        type: 'views_folder',
        icon: <LayoutTemplate className="w-3.5 h-3.5" />,
        hasChildren: true,
        level: 1,
        loadChildren: async () => {
          const res = await fetch(`/api/v1/workspace/tables?connectionId=${connId}&schemaName=${schemaName}`);
          const json = await res.json();
          if (json.code !== 200 || !json.data) return [];
          return json.data
            .filter((t: any) => t.type === 'VIEW')
            .map((t: any) => createViewNode(schemaName, t.name, connId));
        }
      }
    ]
  });

  const createTableNode = (schemaName: string, tableName: string, connId: number): TreeNodeProps => ({
    id: `table-${schemaName}-${tableName}`,
    name: tableName,
    type: 'table',
    icon: <Table className="w-3.5 h-3.5" />,
    hasChildren: true,
    level: 2,
    onDoubleClick: () => {
      addTab({
        id: `tab-table-${schemaName}-${tableName}`,
        title: tableName,
        type: 'table',
        connectionId: connId,
        schemaName,
        tableName
      });
    },
    loadChildren: async () => {
      const colsRes = await fetch(`/api/v1/workspace/columns?connectionId=${connId}&schemaName=${schemaName}&tableName=${tableName}`);
      const idxsRes = await fetch(`/api/v1/workspace/indexes?connectionId=${connId}&schemaName=${schemaName}&tableName=${tableName}`);
      
      const colsJson = await colsRes.json();
      const idxsJson = await idxsRes.json();
      
      const nodes: TreeNodeProps[] = [];
      
      if (colsJson.code === 200 && colsJson.data) {
        colsJson.data.forEach((c: any) => {
          nodes.push({
            id: `col-${schemaName}-${tableName}-${c.name}`,
            name: `${c.name} (${c.dataType})`,
            type: 'column',
            icon: c.primaryKey ? <Key className="w-3.5 h-3.5 text-yellow-500" /> : <Columns className="w-3.5 h-3.5" />,
            hasChildren: false,
            level: 3
          });
        });
      }
      
      if (idxsJson.code === 200 && idxsJson.data) {
        idxsJson.data.forEach((i: any) => {
          nodes.push({
            id: `idx-${schemaName}-${tableName}-${i.name}`,
            name: `${i.name} [${i.type}]`,
            type: 'index',
            icon: <FileCode className="w-3.5 h-3.5 text-green-500" />,
            hasChildren: false,
            level: 3
          });
        });
      }
      
      return nodes;
    }
  });

  const createViewNode = (schemaName: string, viewName: string, connId: number): TreeNodeProps => ({
    id: `view-${schemaName}-${viewName}`,
    name: viewName,
    type: 'view',
    icon: <LayoutTemplate className="w-3.5 h-3.5 text-purple-400" />,
    hasChildren: false,
    level: 2,
    onDoubleClick: () => {
      addTab({
        id: `tab-view-${schemaName}-${viewName}`,
        title: viewName,
        type: 'view',
        connectionId: connId,
        schemaName,
        tableName: viewName
      });
    }
  });

  const handleContextMenu = (e: MouseEvent, node: TreeNodeProps) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  useEffect(() => {
    window.addEventListener('click', closeContextMenu);
    return () => window.removeEventListener('click', closeContextMenu);
  }, []);

  const handleExportDDL = async () => {
    if (!contextMenu?.node) return;
    const node = contextMenu.node;
    if (node.type !== 'table' && node.type !== 'view') return;
    
    // Parse schemaName and tableName from id: table-schema-table
    const parts = node.id.split('-');
    const schemaName = parts[1];
    const tableName = parts.slice(2).join('-'); // handles tables with '-' in name

    try {
      const res = await fetch(`/api/v1/workspace/ddl?connectionId=${connectionId}&schemaName=${schemaName}&tableName=${tableName}`);
      const json = await res.json();
      if (json.code === 200 && json.data) {
        addTab({
          id: `tab-ddl-${schemaName}-${tableName}`,
          title: `${tableName} DDL`,
          type: 'query',
          connectionId,
          schemaName,
          content: json.data
        });
      }
    } catch (e) {
      console.error('Failed to export DDL', e);
    }
  };

  return (
    <div className="relative h-full">
      {loading ? (
        <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-on-surface-variant" /></div>
      ) : schemas.length === 0 ? (
        <div className="p-4 text-xs text-on-surface-variant">No schemas found or not supported.</div>
      ) : (
        schemas.map(s => <TreeNode key={s.id} {...s} onContextMenu={handleContextMenu} />)
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed bg-surface-container-highest border border-outline-variant/30 shadow-lg rounded-md py-1 z-50 min-w-[160px] text-sm"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-xs text-on-surface-variant border-b border-outline-variant/30 mb-1 font-medium">
            {contextMenu.node?.name}
          </div>
          {(contextMenu.node?.type === 'table' || contextMenu.node?.type === 'view') && (
            <div 
              className="px-3 py-1.5 hover:bg-primary/10 hover:text-primary cursor-pointer flex items-center gap-2"
              onClick={() => {
                handleExportDDL();
                closeContextMenu();
              }}
            >
              <FileJson className="w-4 h-4" /> Export DDL
            </div>
          )}
          <div 
            className="px-3 py-1.5 hover:bg-primary/10 hover:text-primary cursor-pointer flex items-center gap-2"
            onClick={() => {
              addTab({
                id: `tab-query-${Date.now()}`,
                title: 'New Query',
                type: 'query',
                connectionId,
                content: ''
              });
              closeContextMenu();
            }}
          >
            <FileCode className="w-4 h-4" /> New Query Console
          </div>
        </div>
      )}
    </div>
  );
}
