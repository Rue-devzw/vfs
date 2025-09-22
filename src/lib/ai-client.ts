const API_TOKEN = process.env.NEXT_PUBLIC_AI_API_TOKEN;

interface FarmingTipResponse {
  tip: string;
}

interface ImageCaptionResponse {
  caption: string;
}

interface ApiResult<T> {
  data: T | null;
  error: string | null;
}

async function parseJson(response: Response): Promise<unknown | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function handleResponse<T>(response: Response): Promise<ApiResult<T>> {
  const payload = await parseJson(response);
  if (!response.ok) {
    const message = (() => {
      if (payload && typeof payload === "object" && "error" in payload) {
        const possibleMessage = (payload as { error?: unknown }).error;
        if (typeof possibleMessage === "string") {
          return possibleMessage;
        }
      }
      return `Request failed with status ${response.status}`;
    })();
    return { data: null, error: message };
  }

  return { data: payload as T, error: null };
}

function buildHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
  };
}

export async function requestFarmingTip(topic: string): Promise<{ tip: string | null; error: string | null }> {
  try {
    const response = await fetch("/api/ai/farming-tip", {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({ topic }),
    });

    const result = await handleResponse<FarmingTipResponse>(response);
    return {
      tip: result.data?.tip ?? null,
      error: result.error,
    };
  } catch (error) {
    console.error("Failed to request farming tip", error);
    return {
      tip: null,
      error: error instanceof Error ? error.message : "Failed to contact the AI service.",
    };
  }
}

export async function requestImageCaption(imageUrl: string): Promise<{ caption: string | null; error: string | null }> {
  try {
    const response = await fetch("/api/ai/image-caption", {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({ imageUrl }),
    });

    const result = await handleResponse<ImageCaptionResponse>(response);
    return {
      caption: result.data?.caption ?? null,
      error: result.error,
    };
  } catch (error) {
    console.error("Failed to request image caption", error);
    return {
      caption: null,
      error: error instanceof Error ? error.message : "Failed to contact the AI service.",
    };
  }
}
