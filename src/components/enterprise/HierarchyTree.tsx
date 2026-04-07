import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserTenant } from "@/hooks/useUserTenant";
import { ChevronRight, ChevronDown, Building2, MapPin, Map as MapIcon, Landmark, Store, Layers, Box, Monitor, Wifi, WifiOff, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { toast } from "sonner";

interface TreeNode {
  id: string;
  name: string;
  type: "region" | "store" | "group" | "device";
  children?: TreeNode[];
  status?: string;
  deviceCount?: number;
  onlineCount?: number;
  meta?: Record<string, any>;
}

const typeIcons: Record<string, any> = {
  region: MapIcon,
  store: Store,
  group: Layers,
  device: Monitor,
};

const typeLabels: Record<string, string> = {
  region: "Região",
  store: "Loja",
  group: "Grupo",
  device: "Dispositivo",
};

interface TreeItemProps {
  node: TreeNode;
  level: number;
  onSelect: (node: TreeNode) => void;
  selectedId: string | null;
  searchActive: boolean;
}

const TreeItem = ({ node, level, onSelect, selectedId, searchActive }: TreeItemProps) => {
  const [expanded, setExpanded] = useState(level < 2 || searchActive);
  const hasChildren = node.children && node.children.length > 0;
  const Icon = typeIcons[node.type] || Monitor;
  const isSelected = selectedId === node.id;
  const { attributes, listeners, setNodeRef: dragRef } = useDraggable({
    id: `drag:${node.type}:${node.id}`,
    data: { type: node.type, id: node.id },
  });
  const { setNodeRef: dropRef, isOver } = useDroppable({
    id: `drop:${node.type}:${node.id}`,
    data: { type: node.type, id: node.id, meta: node.meta },
  });

  useEffect(() => {
    if (searchActive) setExpanded(true);
  }, [searchActive]);

  return (
    <div ref={dropRef}>
      <button
        ref={dragRef}
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          onSelect(node);
        }}
        className={cn(
          "w-full flex items-center gap-2 py-1.5 px-2 rounded-md text-sm transition-colors hover:bg-accent/50",
          isSelected && "bg-primary/10 text-primary font-medium",
          isOver && "ring-1 ring-primary/40"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        data-node-id={node.id}
        data-node-type={node.type}
        {...listeners}
        {...attributes}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
        <span className="truncate flex-1 text-left">{node.name}</span>
        {node.type === "device" && node.status && (
          node.status === "online" ? (
            <Wifi className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />
          )
        )}
        {node.deviceCount !== undefined && node.deviceCount > 0 && node.type !== "device" && (
          <Badge variant="secondary" className="text-[10px] h-4 px-1 gap-1">
            {node.onlineCount !== undefined && node.onlineCount > 0 && (
              <span className="text-green-600 font-bold">{node.onlineCount}/</span>
            )}
            <span>{node.deviceCount}</span>
          </Badge>
        )}
      </button>
      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              selectedId={selectedId}
              searchActive={searchActive}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface HierarchyTreeProps {
  onSelect?: (node: TreeNode) => void;
  search?: string;
}

export const HierarchyTree = ({ onSelect, search }: HierarchyTreeProps) => {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { tenantId } = useUserTenant();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    if (!tenantId) return;
    loadTreeData();
  }, [tenantId]);

  const searchActive = Boolean(search && search.trim().length > 0);
  const filteredTree = (() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return tree;

    const filterNode = (node: TreeNode): TreeNode | null => {
      const nameMatch = (node.name || "").toLowerCase().includes(q);
      const children = (node.children || [])
        .map(filterNode)
        .filter((n): n is TreeNode => Boolean(n));

      if (nameMatch || children.length > 0) {
        return { ...node, children };
      }
      return null;
    };

    return tree.map(filterNode).filter((n): n is TreeNode => Boolean(n));
  })();

  const loadTreeData = async () => {
    setLoading(true);
    try {
      // Load all data in parallel
      const [regionsRes, statesRes, citiesRes, storesRes, groupsRes, devicesRes, companiesRes] = await Promise.all([
        supabase.from("regions").select("id, name, code, country_id").eq("tenant_id", tenantId!),
        supabase.from("states").select("id, name, region_id"),
        supabase.from("cities").select("id, name, state_id"),
        supabase.from("stores").select("id, name, code, city_id, is_active").eq("tenant_id", tenantId!),
        supabase.from("device_groups").select("id, name, store_id, tenant_id").eq("tenant_id", tenantId!),
        supabase.from("devices").select("id, name, device_code, store_id, status, company_id"),
        supabase.from("companies").select("id").eq("tenant_id", tenantId!),
      ]);

      const regions = regionsRes.data || [];
      const states = statesRes.data || [];
      const cities = citiesRes.data || [];
      const stores = storesRes.data || [];
      const groups = groupsRes.data || [];
      const tenantCompanyIds = (companiesRes.data || []).map(c => c.id);
      
      let devices = devicesRes.data || [];
      if (tenantCompanyIds.length > 0) {
        devices = devices.filter(d => tenantCompanyIds.includes(d.company_id));
      }

      // Group devices by group_id (many-to-many)
      const groupIds = groups.map((g: any) => g.id).filter(Boolean);
      const groupMembersRes = groupIds.length
        ? await supabase.from("device_group_members").select("device_id, group_id").in("group_id", groupIds)
        : { data: [], error: null as any };
      
      if (groupMembersRes.error) throw groupMembersRes.error;
      const groupMembers = groupMembersRes.data || [];
      
      const groupDeviceIds = new Map<string, Set<string>>();
      const deviceGroupIds = new Map<string, Set<string>>();
      for (const m of groupMembers) {
        const byGroup = groupDeviceIds.get(m.group_id) || new Set<string>();
        byGroup.add(m.device_id);
        groupDeviceIds.set(m.group_id, byGroup);

        const byDevice = deviceGroupIds.get(m.device_id) || new Set<string>();
        byDevice.add(m.group_id);
        deviceGroupIds.set(m.device_id, byDevice);
      }

      // Maps for quick lookup
      const cityToStateId = new Map(cities.map(c => [c.id, c.state_id]));
      const stateToRegionId = new Map(states.map(s => [s.id, s.region_id]));

      // Build tree: Region > Store > Group > Device
      const treeNodes: TreeNode[] = regions.map((region) => {
        // Find stores for this region by traversing city > state > region
        const regionStores = stores.filter(store => {
          const stateId = cityToStateId.get(store.city_id);
          const regionId = stateId ? stateToRegionId.get(stateId) : null;
          return regionId === region.id;
        });

        const storeNodes: TreeNode[] = regionStores.map((store) => {
          const storeGroups = groups.filter((g) => g.store_id === store.id);
          const storeDevices = devices.filter((d) => d.store_id === store.id);

          const groupNodes: TreeNode[] = storeGroups.map((group) => {
            const memberDeviceIds = groupDeviceIds.get(group.id);
            const groupDevices = memberDeviceIds ? storeDevices.filter((d) => memberDeviceIds.has(d.id)) : [];
            
            return {
              id: group.id,
              name: group.name,
              type: "group" as const,
              deviceCount: groupDevices.length,
              onlineCount: groupDevices.filter(d => d.status === "online").length,
              meta: { store_id: store.id },
              children: groupDevices.map((d) => ({
                id: d.id,
                name: d.name || d.device_code,
                type: "device" as const,
                status: d.status,
              })),
            };
          });

          // Devices in store but NOT in any group
          const ungroupedDevices = storeDevices.filter((d) => !deviceGroupIds.has(d.id));

          return {
            id: store.id,
            name: store.name,
            type: "store" as const,
            deviceCount: storeDevices.length,
            onlineCount: storeDevices.filter(d => d.status === "online").length,
            meta: { code: store.code },
            children: [
              ...groupNodes,
              ...ungroupedDevices.map((d) => ({
                id: d.id,
                name: d.name || d.device_code,
                type: "device" as const,
                status: d.status,
              })),
            ],
          };
        });

        return {
          id: region.id,
          name: region.name,
          type: "region" as const,
          deviceCount: storeNodes.reduce((sum, n) => sum + (n.deviceCount || 0), 0),
          onlineCount: storeNodes.reduce((sum, n) => sum + (n.onlineCount || 0), 0),
          children: storeNodes,
        };
      });

      // Filter out empty regions if necessary, but here we show all
      setTree(treeNodes);
    } catch (err) {
      console.error("Error loading tree:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (node: TreeNode) => {
    setSelectedId(node.id);
    onSelect?.(node);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeData = (active?.data?.current as any) || {};
    const overData = (over?.data?.current as any) || {};
    const activeType = activeData.type;
    const activeId = activeData.id;
    const overType = overData.type;
    const overId = overData.id;
    if (!activeType || !activeId || !overType || !overId) return;
    const overMeta = overData.meta || {};
    if (overMeta?.virtual) return;

    try {
      if (activeType === "device" && overType === "group") {
        const storeId = overMeta?.store_id;
        const { error: delError } = await supabase.from("device_group_members").delete().eq("device_id", activeId);
        if (delError) throw delError;
        if (storeId) {
          const { error: updError } = await supabase.from("devices").update({ store_id: storeId }).eq("id", activeId);
          if (updError) throw updError;
        }
        const { error } = await supabase.from("device_group_members").insert({ device_id: activeId, group_id: overId });
        if (error) throw error;
        toast.success("Dispositivo movido para o grupo");
        await loadTreeData();
        return;
      }
      if (activeType === "device" && overType === "store") {
        const { error: delError } = await supabase.from("device_group_members").delete().eq("device_id", activeId);
        if (delError) throw delError;
        const { error } = await supabase.from("devices").update({ store_id: overId }).eq("id", activeId);
        if (error) throw error;
        toast.success("Dispositivo movido para a loja");
        await loadTreeData();
        return;
      }
      if (activeType === "group" && overType === "store") {
        const { error } = await supabase.from("device_groups").update({ store_id: overId }).eq("id", activeId);
        if (error) throw error;
        toast.success("Grupo movido para a loja");
        await loadTreeData();
        return;
      }
      if (activeType === "store" && overType === "region") {
        // This is tricky because stores link to cities, not regions.
        // We'd need to find a city in that region to move it to, 
        // or add region_id to stores.
        toast.error("Movimentação de loja entre regiões não suportada diretamente.");
        return;
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao mover");
    }
  };

  if (loading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-full" />
        ))}
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
        <AlertCircle className="w-8 h-8 mb-2" />
        <p className="text-sm">Nenhuma empresa encontrada</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <ScrollArea className="h-full">
        <div className="py-2">
          {filteredTree.map((node) => (
            <TreeItem
              key={node.id}
              node={node}
              level={0}
              onSelect={handleSelect}
              selectedId={selectedId}
              searchActive={searchActive}
            />
          ))}
        </div>
      </ScrollArea>
    </DndContext>
  );
};

export type { TreeNode };
