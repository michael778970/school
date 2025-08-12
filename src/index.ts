/**
 * Minimal Cloudflare Workers AI Chat App (No Auth)
 * Streams responses using SSE
 */

export interface Env {
  AI: Ai; // Cloudflare Workers AI binding
}

export default {
  async fetch(req: Request, env: Env) {
    const url = new URL(req.url);

    if (url.pathname === "/api/chat" && req.method === "POST") {
      const body = await req.json<{ messages: { role: string; content: string }[] }>();

      const stream = new ReadableStream({
        async start(controller) {
          const aiStream = await env.AI.stream("@cf/meta/llama-3.3-8b-instruct", {
            messages: body.messages,
          });

          const encoder = new TextEncoder();

          for await (const chunk of aiStream) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          }

          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    if (url.pathname === "/") {
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
<title>Chat</title>
<style>
body { font-family: sans-serif; padding: 20px; }
#chat { border: 1px solid #ccc; padding: 10px; height: 300px; overflow-y: auto; }
</style>
</head>
<body>
<div id="chat"></div>
<input id="msg" placeholder="Type message..." />
<button onclick="send()">Send</button>
<script>
let chat = document.getElementById('chat');
async function send() {
  let msg = document.getElementById('msg').value;
  chat.innerHTML += '<div><b>You:</b> ' + msg + '</div>';
  document.getElementById('msg').value = '';

  let res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: msg }] })
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\\n\\n');
    buffer = parts.pop();
    for (let part of parts) {
      if (part.startsWith('data: ')) {
        let data = JSON.parse(part.slice(6));
        if (data.response) {
          chat.innerHTML += '<div><b>AI:</b> ' + data.response + '</div>';
        }
      }
    }
  }
}
</script>
</body>
</html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    return new Response("Not Found", { status: 404 });
  },
};
