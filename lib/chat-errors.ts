import { APICallError } from "ai";

export function formatProviderError(error: unknown): string {
  if (error instanceof APICallError) {
    const data = error.data as
      | { error?: { message?: string; title?: string } }
      | undefined;

    if (data?.error?.message) {
      return data.error.message;
    }

    if (data?.error?.title) {
      return data.error.title;
    }

    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Something went wrong while generating a response.";
}
