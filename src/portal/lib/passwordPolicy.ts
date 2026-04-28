export function validatePortalPassword(pwd: string): { ok: boolean; error?: string } {
  if (pwd.length < 12) return { ok: false, error: 'La contraseña debe tener al menos 12 caracteres.' };
  if (!/[A-Z]/.test(pwd)) return { ok: false, error: 'Debe contener al menos una mayúscula.' };
  if (!/[a-z]/.test(pwd)) return { ok: false, error: 'Debe contener al menos una minúscula.' };
  if (!/[0-9]/.test(pwd)) return { ok: false, error: 'Debe contener al menos un número.' };
  if (!/[^A-Za-z0-9]/.test(pwd)) return { ok: false, error: 'Debe contener al menos un símbolo.' };
  return { ok: true };
}
