

## Corrigir carregamento de dados ao editar dispositivo

### Problema
O `DeviceFormDialog` usa `defaultValues` do `react-hook-form`, que so sao aplicados na primeira montagem do componente. Quando o dialog e reaberto para editar outro dispositivo (ou o mesmo), os campos continuam com os valores antigos ou vazios.

### Solucao
Adicionar um `useEffect` que chama `form.reset()` com os dados do dispositivo sempre que a prop `device` mudar ou o dialog abrir. Isso garante que os campos sejam preenchidos corretamente com as informacoes ja salvas.

### Detalhes tecnicos

**Arquivo**: `src/components/devices/DeviceFormDialog.tsx`

1. Adicionar `useEffect` apos a criacao do form:
```typescript
useEffect(() => {
  if (open) {
    form.reset({
      name: device?.name || "",
      device_code: device?.device_code || generateDeviceCode(),
      store_id: device?.store_id || undefined,
      current_playlist_id: device?.current_playlist_id || undefined,
      resolution: device?.resolution || "1920x1080",
      camera_enabled: device?.camera_enabled || false,
      store_code: (device as any)?.store_code || "",
    });
  }
}, [device, open]);
```

2. Adicionar `useEffect` ao import do React (ja esta `useState`, adicionar `useEffect`).

Essa unica alteracao resolve o problema para criar e editar: ao abrir para novo, reseta com valores padrao; ao abrir para editar, preenche com os dados existentes.

