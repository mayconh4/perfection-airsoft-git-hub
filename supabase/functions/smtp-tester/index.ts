import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

// Polyfill para Deno.writeAll que sumiu nas novas versões do Edge Runtime do Supabase
if (!(Deno as any).writeAll) {
  (Deno as any).writeAll = async (w: any, data: Uint8Array) => {
    let nwritten = 0;
    while (nwritten < data.length) {
      nwritten += await w.write(data.subarray(nwritten));
    }
  };
}

const SMTP_HOSTNAME = Deno.env.get("SMTP_HOSTNAME") || "smtp.hostinger.com";
const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || "465");
const SMTP_USERNAME = Deno.env.get("SMTP_USERNAME");
const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD");

Deno.serve(async (req) => {
  console.log("--- SMTP DIAGNOSTIC START ---");
  console.log(`Host: ${SMTP_HOSTNAME}:${SMTP_PORT}`);
  console.log(`User: ${SMTP_USERNAME}`);
  
  if (!SMTP_USERNAME || !SMTP_PASSWORD) {
    return new Response(JSON.stringify({ error: "Missing SMTP credentials" }), { status: 500 });
  }

  const client = new SmtpClient();

  try {
    console.log("Connecting and Authenticating to SMTP server via TLS...");
    await client.connectTLS({
      hostname: SMTP_HOSTNAME,
      port: SMTP_PORT,
      username: SMTP_USERNAME,
      password: SMTP_PASSWORD,
    });
    console.log("Connected and Authenticated successfully!");

    console.log("Sending test email...");
    await client.send({
      from: SMTP_USERNAME,
      to: "maycontuliofs@gmail.com",
      subject: "TESTE TÁTICO FINAL - Perfection Airsoft",
      content: "Se você recebeu este e-mail, agora sim o sistema está 100% BLINDADO e funcionando!",
    });

    await client.close();
    console.log("--- SMTP DIAGNOSTIC SUCCESS ---");

    return new Response(JSON.stringify({ 
      success: true, 
      message: "E-mail de teste enviado com sucesso! Agora sim está tudo certo." 
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("--- SMTP DIAGNOSTIC FAILED ---");
    console.error("Error Message:", error.message);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
