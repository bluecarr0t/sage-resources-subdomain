type ApiErrorFields = {
  error?: string;
  message?: string;
};

export async function readApiJson<T>(
  res: Response,
  fallbackMessage: string
): Promise<T & ApiErrorFields> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    if (!res.ok) {
      throw new Error(fallbackMessage);
    }
    return {} as T & ApiErrorFields;
  }

  try {
    return JSON.parse(trimmed) as T & ApiErrorFields;
  } catch {
    throw new Error(fallbackMessage);
  }
}
