/**
 * Cliente da Evolution API v2 para integração com WhatsApp via QR Code / Baileys.
 * Conecta-se à instância gerenciada (ex: NexusReplay na https://evol.nexusia.work) ou local.
 */

export const DEFAULT_EVOLUTION_URL =
  process.env.EVOLUTION_API_URL || "https://evol.nexusia.work";

export const DEFAULT_EVOLUTION_API_KEY =
  process.env.EVOLUTION_API_KEY || "1C49E1C072E4-4898-8306-2F3F35289F20";

export const DEFAULT_INSTANCE_NAME = "NexusReplay";
export const DEFAULT_PHONE_NUMBER = "5534953309898";
export const DEFAULT_MANAGER_URL =
  "https://evol.nexusia.work/manager/instance/1fe77663-64a4-412e-b088-06b84486a74c";

export interface EvolutionInstance {
  id: string;
  name: string;
  connectionStatus: "open" | "connecting" | "close" | "refused";
  ownerJid?: string;
  profileName?: string;
  profilePicUrl?: string;
  number?: string;
  token?: string;
  integration?: string;
  _count?: {
    Message?: number;
    Contact?: number;
    Chat?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface PairingCodeResponse {
  pairingCode?: string;
  code?: string;
  count?: number;
}

export interface QrCodeResponse {
  pairingCode?: string;
  code?: string;
  base64?: string;
  count?: number;
}

export interface ConnectionStateResponse {
  instance?: {
    instanceName: string;
    state: "open" | "connecting" | "close" | "refused";
  };
}

async function evoFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  baseUrl = DEFAULT_EVOLUTION_URL,
  apiKey = DEFAULT_EVOLUTION_API_KEY
): Promise<T> {
  const urls = [
    `${baseUrl.replace(/\/+$/, "")}${endpoint}`,
    `https://evol.nexusia.work${endpoint}`,
    `http://127.0.0.1:8080${endpoint}`,
  ];

  let lastError: Error | null = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          apikey: apiKey,
          ...(options.headers || {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Evolution API error HTTP ${res.status}: ${text}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error("Falha ao comunicar com a Evolution API.");
}

/** Lista todas as instâncias existentes */
export async function getEvolutionInstances(): Promise<EvolutionInstance[]> {
  try {
    return await evoFetch<EvolutionInstance[]>("/instance/fetchInstances");
  } catch (err) {
    console.error("[Evolution] Falha ao listar instâncias:", err);
    return [];
  }
}

/** Obtém o estado de conexão atual de uma instância */
export async function getEvolutionConnectionState(
  instanceName = DEFAULT_INSTANCE_NAME
): Promise<"open" | "connecting" | "close" | "refused" | "unknown"> {
  try {
    const res = await evoFetch<ConnectionStateResponse>(
      `/instance/connectionState/${encodeURIComponent(instanceName)}`
    );
    return res.instance?.state ?? "close";
  } catch (err) {
    console.warn(`[Evolution] Estado não acessível para ${instanceName}:`, err);
    return "close";
  }
}

/** Cria uma nova instância no Evolution API */
export async function createEvolutionInstance(
  instanceName: string,
  token = DEFAULT_EVOLUTION_API_KEY
): Promise<EvolutionInstance> {
  return await evoFetch<EvolutionInstance>("/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName: instanceName.trim(),
      token,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    }),
  });
}

/** Obtém o QR Code em base64 para pareamento */
export async function getEvolutionQrCode(
  instanceName = DEFAULT_INSTANCE_NAME
): Promise<QrCodeResponse> {
  return await evoFetch<QrCodeResponse>(`/instance/connect/${encodeURIComponent(instanceName)}`);
}

/** Solicita código de pareamento numérico de 8 dígitos */
export async function getEvolutionPairingCode(
  instanceName = DEFAULT_INSTANCE_NAME,
  phoneNumber = DEFAULT_PHONE_NUMBER
): Promise<PairingCodeResponse> {
  const cleanPhone = phoneNumber.replace(/\D/g, "");
  return await evoFetch<PairingCodeResponse>(
    `/instance/connect/${encodeURIComponent(instanceName)}?number=${cleanPhone}`
  );
}

/** Configura o Webhook da instância */
export async function setEvolutionWebhook(
  instanceName = DEFAULT_INSTANCE_NAME,
  webhookUrl = "https://app.nexusia.work/api/webhooks/evolution"
) {
  return await evoFetch(`/webhook/set/${encodeURIComponent(instanceName)}`, {
    method: "POST",
    body: JSON.stringify({
      webhook: {
        enabled: true,
        url: webhookUrl,
        byEvents: false,
        base64: false,
        events: [
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "SEND_MESSAGE",
          "CONNECTION_UPDATE",
        ],
      },
    }),
  });
}

/** Desconecta / Realiza Logout da instância */
export async function logoutEvolutionInstance(
  instanceName = DEFAULT_INSTANCE_NAME
): Promise<boolean> {
  try {
    await evoFetch(`/instance/logout/${encodeURIComponent(instanceName)}`, {
      method: "DELETE",
    });
    return true;
  } catch (err) {
    console.error("[Evolution] Falha ao deslogar instância:", err);
    return false;
  }
}

/** Reinicia a instância */
export async function restartEvolutionInstance(
  instanceName = DEFAULT_INSTANCE_NAME
): Promise<boolean> {
  try {
    await evoFetch(`/instance/restart/${encodeURIComponent(instanceName)}`, {
      method: "PUT",
    });
    return true;
  } catch (err) {
    console.error("[Evolution] Falha ao reiniciar instância:", err);
    return false;
  }
}

/** Deleta a instância */
export async function deleteEvolutionInstance(
  instanceName = DEFAULT_INSTANCE_NAME
): Promise<boolean> {
  try {
    await evoFetch(`/instance/delete/${encodeURIComponent(instanceName)}`, {
      method: "DELETE",
    });
    return true;
  } catch (err) {
    console.error("[Evolution] Falha ao deletar instância:", err);
    return false;
  }
}

/** Envia mensagem de texto via Evolution API */
export async function sendEvolutionText(
  instanceName = DEFAULT_INSTANCE_NAME,
  number: string,
  text: string
): Promise<{ key: { id: string } }> {
  const cleanNumber = number.replace(/\D/g, "");
  return await evoFetch<{ key: { id: string } }>(
    `/message/sendText/${encodeURIComponent(instanceName)}`,
    {
      method: "POST",
      body: JSON.stringify({
        number: cleanNumber,
        text,
        options: {
          delay: 1200,
          presence: "composing",
        },
      }),
    }
  );
}
