import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (_req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const results: Record<string, string> = {};

  const migrations = [
    {
      name: "cart_items_metadata",
      sql: "ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL"
    },
    {
      name: "order_items_metadata",
      sql: "ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL"
    },
    {
      name: "cart_items_product_id_nullable",
      sql: "ALTER TABLE public.cart_items ALTER COLUMN product_id DROP NOT NULL"
    },
    {
      name: "order_items_product_id_nullable",
      sql: "ALTER TABLE public.order_items ALTER COLUMN product_id DROP NOT NULL"
    }
  ];

  for (const m of migrations) {
    try {
      const { error } = await supabase.rpc("exec_sql", { sql: m.sql }).single();
      if (error) {
        // Tenta via query direto
        const res = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/exec_sql`,
          {
            method: "POST",
            headers: {
              "apikey": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ sql: m.sql })
          }
        );
        results[m.name] = res.ok ? "OK" : `ERRO: ${await res.text()}`;
      } else {
        results[m.name] = "OK";
      }
    } catch (e: any) {
      results[m.name] = `CATCH: ${e.message}`;
    }
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { "Content-Type": "application/json" }
  });
});
