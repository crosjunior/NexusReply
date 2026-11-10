"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/supabase/server";
import {
  getEvolutionInstances,
  createEvolutionInstance,
  getEvolutionQrCode,
  getEvolutionPairingCode,
  logoutEvolutionInstance,
  deleteEvolutionInstance,
  type EvolutionInstance,
} from "@/lib/whatsapp/evolution";

export async function fetchWhatsappInstances(): Promise<EvolutionInstance[]> {
  await requireSession();
  return await getEvolutionInstances();
}

export async function createWhatsappInstanceAction(instanceName: string) {
  const { workspace } = await requireSession();
  if (!workspace.whatsappEnabled && !workspace.isUnlimited) {
    return {
      ok: false,
      error: "A conexão com o WhatsApp é exclusiva para assinantes VIP. Entre em contato com o administrador para desbloquear.",
    };
  }
  try {
    const inst = await createEvolutionInstance(instanceName);
    revalidatePath("/app/connections");
    return { ok: true, instance: inst };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falha ao criar instância" };
  }
}

export async function getWhatsappQrCodeAction(instanceName: string) {
  await requireSession();
  try {
    const data = await getEvolutionQrCode(instanceName);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falha ao obter QR Code" };
  }
}

export async function getWhatsappPairingCodeAction(instanceName: string, phone: string) {
  await requireSession();
  try {
    const data = await getEvolutionPairingCode(instanceName, phone);
    return { ok: true, code: data.pairingCode || data.code };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falha ao gerar código de pareamento" };
  }
}

export async function disconnectWhatsappAction(instanceName: string): Promise<void> {
  await requireSession();
  await logoutEvolutionInstance(instanceName);
  revalidatePath("/app/connections");
}

export async function deleteWhatsappAction(instanceName: string): Promise<void> {
  await requireSession();
  await deleteEvolutionInstance(instanceName);
  revalidatePath("/app/connections");
}

