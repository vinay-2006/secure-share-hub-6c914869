/**
 * Mock Edge Function handlers for local development
 * These replace actual Supabase Edge Functions when they're not deployed
 */

const isDevelopment = import.meta.env.MODE === 'development';

export async function callEdgeFunction(
  functionName: string,
  payload: Record<string, unknown>,
  token: string
): Promise<{ success: boolean; error?: string; data?: unknown }> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // In development, provide more helpful error messages
      if (isDevelopment) {
        console.warn(
          `Edge Function '${functionName}' returned ${response.status}. ` +
          `Is it deployed to Supabase? Run: supabase functions deploy`
        );
      }
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    if (isDevelopment) {
      console.error(
        `Failed to call Edge Function '${functionName}': ${errorMsg}`
      );
      console.warn(
        `To fix this:\n` +
        `1. Run: supabase functions deploy\n` +
        `2. Configure ADMIN_USER_IDS environment variable\n` +
        `3. Set edge function secrets: supabase secrets set`
      );
    }

    throw new Error(
      `Failed to call Edge Function: ${functionName}. ` +
      `Make sure it's deployed to Supabase. Error: ${errorMsg}`
    );
  }
}

export function getEdgeFunctionErrorMessage(functionName: string): string {
  return (
    `The ${functionName} Edge Function is not accessible. ` +
    `This usually means:\n\n` +
    `1. The Edge Function hasn't been deployed yet\n` +
    `2. There's a network/CORS issue\n` +
    `3. Supabase credentials are incorrect\n\n` +
    `To deploy Edge Functions:\n` +
    `  supabase link\n` +
    `  supabase functions deploy\n` +
    `  supabase secrets set ADMIN_USER_IDS="user-id-1,user-id-2"`
  );
}
