/**
 * Cliente da Evolution API v2 para integração com WhatsApp via QR Code / Baileys.
 * Conecta-se à instância local no servidor EC2 ou via URL pública.
 */

const EVOLUTION_URL =
  process.env.EVOLUTION_API_URL ||
  (process.env.NODE_ENV === "production" ? "http://172.17.0.1:8080" : "https://api.nexusia.work");

const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "NEXUSTEVAH2025";

export interface EvolutionInstance {
  id: string;
  name: string;
  connectionStatus: "open" | "connecting" | "close" | "refused";
  ownerJid?: string;
  profileName?: string;
  profilePicUrl?: string;
  number?: string;
  token?: string;
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

async function evoFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Tenta conectar no endpoint configurado e faz fallback para localhost:8080 ou api.nexusia.work
  const urls = [
    `${EVOLUTION_URL}${endpoint}`,
    `http://127.0.0.1:8080${endpoint}`,
    `https://api.nexusia.work${endpoint}`,
  ];

  let lastError: Error | null = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_API_KEY,
          ...(options.headers || {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
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

/** Cria uma nova instância */
export async function createEvolutionInstance(instanceName: string): Promise<EvolutionInstance> {
  return await evoFetch<EvolutionInstance>("/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName: instanceName.trim(),
      token: EVOLUTION_API_KEY,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    }),
  });
}

/** Obtém o QR Code para pareamento */
export async function getEvolutionQrCode(instanceName: string): Promise<QrCodeResponse> {
  return await evoFetch<QrCodeResponse>(`/instance/connect/${encodeURIComponent(instanceName)}`);
}

/** Solicita código de pareamento numérico de 8 dígitos */
export async function getEvolutionPairingCode(
  instanceName: string,
  phoneNumber: string
): Promise<PairingCodeResponse> {
  const cleanPhone = phoneNumber.replace(/\D/g, "");
  return await evoFetch<PairingCodeResponse>(
    `/instance/connect/${encodeURIComponent(instanceName)}?number=${cleanPhone}`
  );
}

/** Desconecta / Realiza Logout da instância */
export async function logoutEvolutionInstance(instanceName: string): Promise<boolean> {
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

/** Deleta a instância */
export async function deleteEvolutionInstance(instanceName: string): Promise<boolean> {
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
  instanceName: string,
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

