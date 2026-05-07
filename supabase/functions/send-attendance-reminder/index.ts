import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ ok: false, error: 'No authorization' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    const userId = userData?.user?.id;
    if (!userId) return json({ ok: false, error: 'Invalid token' }, 401);

    const body = await req.json().catch(() => ({}));
    const { worker_id, message_text } = body ?? {};
    if (!worker_id || typeof message_text !== 'string') {
      return json({ ok: false, error: 'worker_id y message_text requeridos' }, 400);
    }
    if (message_text.length < 10 || message_text.length > 1000) {
      return json({ ok: false, error: 'El mensaje debe tener entre 10 y 1000 caracteres' }, 400);
    }

    // Worker
    const { data: worker, error: wErr } = await supabase
      .from('portal_workers')
      .select('id, first_name, last_name, phone, active')
      .eq('id', worker_id)
      .maybeSingle();
    if (wErr || !worker) return json({ ok: false, error: 'Trabajador no encontrado' }, 404);

    // Already sent today?
    const { data: existing } = await supabase
      .from('portal_attendance_reminders')
      .select('id, sent_at')
      .eq('worker_id', worker_id)
      .in('status', ['sent', 'pending'])
      .gte('sent_at', new Date(new Date().toISOString().slice(0, 10)).toISOString())
      .limit(1);
    if (existing && existing.length > 0) {
      return json({ ok: false, ya_enviado_hoy: true, error: 'Ya se envió recordatorio hoy' }, 409);
    }

    const nombre = `${worker.first_name ?? ''}`.trim() || 'colega';
    const finalMessage = (message_text as string).replace(/\{nombre\}/g, nombre);

    const { error: insErr } = await supabase
      .from('portal_attendance_reminders')
      .insert({
        worker_id,
        sent_by: userId,
        message_text: finalMessage,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
    if (insErr) return json({ ok: false, error: insErr.message }, 500);

    return json({ ok: true, phone: worker.phone ?? null });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
