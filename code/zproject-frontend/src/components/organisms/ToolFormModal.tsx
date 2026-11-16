import { Button, Group, Modal, NumberInput, Select, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import axios from "axios";
import { useState } from "react";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { createTool, updateTool } from "../../services/toolService";
import type { Tool, ToolCreate, ToolStatus } from "../../types/tool";
import { notifyError, notifySuccess } from "../../utils/notify";
import { FormActions } from "../molecules/FormActions";

const STATUS_OPTIONS: { value: ToolStatus; label: string }[] = [
  { value: "disponible", label: "Disponible" },
  { value: "en_uso", label: "En uso" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "baja", label: "Baja" },
];

interface ToolFormValues {
  name: string;
  description: string;
  quantity: number | string;
  status: ToolStatus;
}

interface ToolFormProps {
  tool: Tool | null;
  onSaved: () => void;
  onCancel: () => void;
}

function ToolForm({ tool, onSaved, onCancel }: ToolFormProps) {
  const { busy, run } = useAsyncAction();
  const [duplicate, setDuplicate] = useState<ToolCreate | null>(null);

  const form = useForm<ToolFormValues>({
    initialValues: {
      name: tool?.name ?? "",
      description: tool?.description ?? "",
      quantity: tool?.quantity ?? 0,
      status: tool?.status ?? "disponible",
    },
    validate: {
      name: (value) => {
        if (!value.trim()) return "Ingresa el nombre";
        if (value.trim().length > 100) return "Máximo 100 caracteres";
        return null;
      },
      description: (value) =>
        value.length > 255 ? "Máximo 255 caracteres" : null,
      quantity: (value) =>
        value === "" || Number(value) < 0 || !Number.isInteger(Number(value))
          ? "Debe ser un entero mayor o igual a 0"
          : null,
      status: (value, values) => {
        if (!value) return "Selecciona un estado";
        if (
          Number(values.quantity) === 0 &&
          (value === "disponible" || value === "en_uso")
        ) {
          return "Sin unidades no puede estar disponible ni en uso";
        }
        return null;
      },
    },
  });

  const handleSubmit = async (values: ToolFormValues) => {
    const payload: ToolCreate = {
      name: values.name.trim(),
      description: values.description.trim(),
      quantity: Number(values.quantity),
      status: values.status,
    };

    if (tool) {
      const ok = await run(async () => {
        try {
          await updateTool(tool.id, payload);
          notifySuccess("Herramienta actualizada");
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 404) {
            notifyError(error);
            return;
          }
          throw error;
        }
      });
      if (ok) {
        onSaved();
      }
      return;
    }

    let conflict = false;
    const ok = await run(async () => {
      try {
        await createTool(payload);
        notifySuccess("Herramienta creada");
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 409) {
          conflict = true;
          setDuplicate(payload);
          return;
        }
        throw error;
      }
    });
    if (ok && !conflict) {
      onSaved();
    }
  };

  const handleForce = async () => {
    if (!duplicate) return;
    const ok = await run(() => createTool(duplicate, true), "Herramienta creada");
    if (ok) {
      setDuplicate(null);
      onSaved();
    }
  };

  return (
    <>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Nombre"
            placeholder="Taladro"
            maxLength={100}
            {...form.getInputProps("name")}
          />
          <TextInput
            label="Descripción"
            placeholder="Opcional"
            maxLength={255}
            {...form.getInputProps("description")}
          />
          <NumberInput
            label="Cantidad"
            min={0}
            allowDecimal={false}
            {...form.getInputProps("quantity")}
          />
          <Select
            label="Estado"
            data={STATUS_OPTIONS}
            allowDeselect={false}
            {...form.getInputProps("status")}
          />
          <FormActions submitting={busy} onCancel={onCancel} />
        </Stack>
      </form>

      <Modal
        opened={duplicate !== null}
        onClose={() => setDuplicate(null)}
        title="Herramienta duplicada"
        centered
      >
        <Stack>
          <Text>
            Ya existe una herramienta con ese nombre. ¿Deseas crearla de todas
            formas?
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDuplicate(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={handleForce} loading={busy}>
              Crear de todas formas
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

interface ToolFormModalProps {
  opened: boolean;
  tool: Tool | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ToolFormModal({ opened, tool, onClose, onSaved }: ToolFormModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={tool ? "Editar herramienta" : "Nueva herramienta"}
      centered
    >
      <ToolForm tool={tool} onSaved={onSaved} onCancel={onClose} />
    </Modal>
  );
}
