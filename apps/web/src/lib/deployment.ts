/**
 * URLs a Vercel preview deployment answers on, read from the system
 * variables Vercel sets: the branch's URL first, as the one people share,
 * then the deployment's own, unique to each push. Empty anywhere else, such
 * as in production or on a laptop.
 */
export function previewUrls(variables: Readonly<Record<string, string | undefined>>): string[] {
  if (variables["VERCEL_ENV"] !== "preview") {
    return [];
  }
  return [variables["VERCEL_BRANCH_URL"], variables["VERCEL_URL"]]
    .filter((host): host is string => Boolean(host))
    .map((host) => `https://${host}`);
}
