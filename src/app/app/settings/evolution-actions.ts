"use server";

import { revalidatePath } from "next/cache";
import {
  DEFAULT_EVOLUTION_URL,
  DEFAULT_EVOLUTION_API_KEY,
  DEFAULT_INSTANCE_NAME,
  DEFAULT_PHONE_NUMBER,
  DEFAULT_MANAGER_URL,
  getEvolutionConnectionState,
  getEvolutionQrCode,
  getEvolutionPairingCode,
  setEvolutionWebhook,
  restartEvolutionInstance,
  logoutEvolutionInstance,
  getEvolutionInstances,
} from "@/lib/whatsapp/evolution";

export interface EvolutionState {
  instanceName: string;
  phoneNumber: string;
  serverUrl: string;
  managerUrl: string;
  channel: string;
  status: "open" | "connecting" | "close" | "refused" | "unknown";
  lastCheckAt: string;
}

export async function getEvolutionStatus(): Promise<EvolutionState> {
  const status = await getEvolutionConnectionState(DEFAULT_INSTANCE_NAME);
  return {
    instanceName: DEFAULT_INSTANCE_NAME,
    phoneNumber: DEFAULT_PHONE_NUMBER,
    serverUrl: DEFAULT_EVOLUTION_URL,
    managerUrl: DEFAULT_MANAGER_URL,
    channel: "Baileys",
    status,
    lastCheckAt: new Date().toISOString(),
  };
}

export async function fetchQrCode() {
  try {
    const res = await getEvolutionQrCode(DEFAULT_INSTANCE_NAME);
    return { ok: true, base64: res.base64, code: res.code, pairingCode: res.pairingCode };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro ao carregar QR Code" };
  }
}

export async function fetchPairingCode(phoneNumber: string) {
  try {
    const res = await getEvolutionPairingCode(DEFAULT_INSTANCE_NAME, phoneNumber);
    return { ok: true, code: res.pairingCode || res.code };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro ao gerar código de pareamento" };
  }
}

export async function configureWebhook() {
  try {
    await setEvolutionWebhook(DEFAULT_INSTANCE_NAME);
    revalidatePath("/app/settings");
    revalidatePath("/app");
    return { ok: true, message: "Webhook registrado com sucesso na Evolution API!" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro ao configurar Webhook" };
  }
}

export async function restartInstance() {
  try {
    const ok = await restartEvolutionInstance(DEFAULT_INSTANCE_NAME);
    revalidatePath("/app/settings");
    revalidatePath("/app");
    return { ok, message: ok ? "Instância reiniciada." : "Falha ao reiniciar." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro ao reiniciar" };
  }
}

export async function disconnectInstance() {
  try {
    const ok = await logoutEvolutionInstance(DEFAULT_INSTANCE_NAME);
    revalidatePath("/app/settings");
    revalidatePath("/app");
    return { ok, message: ok ? "Instância desconectada com sucesso." : "Falha ao desconectar." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro ao desconectar" };
  }
}
