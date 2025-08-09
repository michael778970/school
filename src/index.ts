<!DOCTYPE html>
<html lang="en" class="h-full bg-gray-900 text-white">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LLM Chat App</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="h-full flex flex-col">
  <!-- Chat Container -->
  <div class="flex flex-col flex-grow max-w-3xl mx-auto w-full p-4">
    <h1 class="text-2xl font-bold mb-4 text-center">💬 LLM Chat</h1>
    
    <!-- Messages -->
    <div id="chat-box" class="flex flex-col gap-3 flex-grow overflow-y-auto bg-gray-800 p-4 rounded-lg shadow-lg">
      <!-- Messages will be appended here -->
    </div>

    <!-- Input Area -->
    <form id="chat-form" class="mt-4 flex gap-2">
      <input
        id="chat-input"
        type="text"
        placeholder="Type your message..."
        class="flex-grow px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      />
      <button
        type="submit"
        class="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition"
      >
        Send
      </button>
    </form>
  </div>

  <script>
    const form = document.getElementById("chat-form");
    const input = document.getElementById("chat-input");
    const chatBox = document.getElementById("chat-box");

    function addMessage(content, sender) {
      const msg = document.createElement("div");
      msg.className = `p-3 rounded-lg max-w-[80%] ${
        sender === "user"
          ? "bg-blue-600 self-end"
          : "bg-gray-700 self-start"
      }`;
      msg.textContent = content;
      chatBox.appendChild(msg);
      chatBox.scrollTop = chatBox.scrollHeight;
    }

    async function sendMessage(message) {
      addMessage(message, "user");
      input.value = "";
      
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: message }]
          })
        });

        if (!res.ok) throw new Error("Network error");

        const reader = res.body.getReader();
        let responseText = "";
        const botMsg = document.createElement("div");
        botMsg.className = "p-3 rounded-lg bg-gray-700 self-start";
        chatBox.appendChild(botMsg);

        // Streaming handling
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = new TextDecoder().decode(value);
          responseText += chunk;
          botMsg.textContent = responseText;
          chatBox.scrollTop = chatBox.scrollHeight;
        }
      } catch (err) {
        addMessage("⚠️ Error: " + err.message, "bot");
      }
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      sendMessage(input.value.trim());
    });
  </script>
</body>
</html>
