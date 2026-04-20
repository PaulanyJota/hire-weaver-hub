import { supabase } from '@/integrations/supabase/client';

/**
 * Returns a usable URL for a CV.
 * - External URLs (http/https not pointing to our storage) are returned as-is.
 * - Storage object paths or public URLs from our 'cvs' bucket are converted to signed URLs.
 */
export async function resolveCvUrl(cvUrl: string): Promise<string> {
  if (!cvUrl) return cvUrl;

  // Detect if it's a Supabase storage URL for our cvs bucket
  const storageMatch = cvUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/cvs\/([^?]+)/);
  if (storageMatch) {
    const path = decodeURIComponent(storageMatch[1]);
    const { data, error } = await supabase.storage.from('cvs').createSignedUrl(path, 3600);
    if (error || !data) return cvUrl;
    return data.signedUrl;
  }

  // External URL (Drive, Dropbox, etc.) — return as-is
  return cvUrl;
}

/**
 * Opens a CV URL in a new tab, signing it first if necessary.
 */
export async function openCv(cvUrl: string) {
  const url = await resolveCvUrl(cvUrl);
  window.open(url, '_blank', 'noopener,noreferrer');
}
