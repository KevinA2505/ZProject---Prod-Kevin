import { Button, Group, Select } from "@mantine/core";
import axios from "axios";
import { useCallback, useState } from "react";
import { PermissionGate } from "../components/atoms/PermissionGate";
import { ConfirmModal } from "../components/molecules/ConfirmModal";
import { PageHeader } from "../components/molecules/PageHeader";
import { DataTable, type Column } from "../components/organisms/DataTable";
import { ToolFormModal } from "../components/organisms/ToolFormModal";
import { useAsyncAction } from "../hooks/useAsyncAction";
import { useItemModal } from "../hooks/useItemModal";
import { useLoad } from "../hooks/useLoad";
import { deleteTool, getTools } from "../services/toolService";
import type { Tool, ToolStatus } from "../types/tool";
import { notifyError, notifySuccess } from "../utils/notify";

const STATUS_LABELS: Record<ToolStatus, string> = {
  disponible: "Disponible",
  en_uso: "En uso",
  mantenimiento: "Mantenimiento",
  baja: "Baja",
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function ToolsPage() {
  const [statusFilter, setStatusFilter] = useState<ToolStatus | null>(null);
  const fetcher = useCallback(
    () => getTools(statusFilter ?? undefined),
    [statusFilter],
  );
  const { data: tools, loading, reload } = useLoad(fetcher, [] as Tool[]);

  const formModal = useItemModal<Tool>();
  const deleteModal = useItemModal<Tool>();
  const { busy: deleteBusy, run } = useAsyncAction();

  const handleSaved = () => {
    formModal.close();
    reload();
  };

  const handleDelete = async () => {
    const target = deleteModal.item;
    if (!target) return;

    const ok = await run(async () => {
      try {
        await deleteTool(target.id);
        notifySuccess("Herramienta eliminada");
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          notifyError(error);
          return;
        }
        throw error;
      }
    });
    if (ok) {
      deleteModal.close();
      reload();
    }
  };

  const columns: Column<Tool>[] = [
    { header: "Nombre", render: (tool) => tool.name },
    { header: "Descripcion", render: (tool) => tool.description || "—" },
    { header: "Cantidad", render: (tool) => tool.quantity },
    { header: "Estado", render: (tool) => STATUS_LABELS[tool.status] ?? tool.status },
    {
      header: "Acciones",
      render: (tool) => (
        <Group gap="xs">
          <PermissionGate permission="tools:update">
            <Button
              size="xs"
              variant="default"
              onClick={() => formModal.open(tool)}
            >
              Editar
            </Button>
          </PermissionGate>
          <PermissionGate permission="tools:delete">
            <Button
              size="xs"
              variant="light"
              color="red"
              onClick={() => deleteModal.open(tool)}
            >
              Eliminar
            </Button>
          </PermissionGate>
        </Group>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Herramientas"
        actions={
          <Group>
            <Select
              placeholder="Todos los estados"
              data={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as ToolStatus | null)}
              clearable
              w={200}
            />
            <PermissionGate permission="tools:create">
              <Button onClick={() => formModal.open()}>Nueva herramienta</Button>
            </PermissionGate>
          </Group>
        }
      />

      <DataTable
        rows={tools}
        columns={columns}
        getRowKey={(tool) => tool.id}
        loading={loading}
        emptyMessage={
          statusFilter
            ? "Ninguna herramienta cumple el criterio."
            : "No hay herramientas registradas."
        }
      />

      <ToolFormModal
        opened={formModal.opened}
        tool={formModal.item}
        onClose={formModal.close}
        onSaved={handleSaved}
      />

      <ConfirmModal
        opened={deleteModal.opened}
        title="Eliminar herramienta"
        message={
          deleteModal.item
            ? `¿Eliminar la herramienta ${deleteModal.item.name}? El historial se conserva.`
            : ""
        }
        confirmLabel="Eliminar"
        loading={deleteBusy}
        onConfirm={handleDelete}
        onCancel={deleteModal.close}
      />
    </>
  );
}
