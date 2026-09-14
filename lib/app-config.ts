export const configured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
export const appUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL || "https://leadnuvia.com").replace(
    /\/$/,
    "",
  );
