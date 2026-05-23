import { requireApiSession } from "@/lib/api-auth";
import { getDefaultProviderPublicConfig } from "@/lib/ai-provider";

export async function GET() {
  const authResult = await requireApiSession();
  if (authResult.errorResponse) {
    return authResult.errorResponse;
  }

  const config = getDefaultProviderPublicConfig();

  return Response.json({
    defaultConfigured: config.defaultConfigured,
    defaultModel: config.defaultModel,
  });
}
