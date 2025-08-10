/**
 * LLM Chat App Frontend (Enhanced UI/UX)
 */

// DOM elements
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");

// Chat state
let chatHistory = [
  { role: "assistant", content: "Hi, I am here to help you learn." },
];
let isProcessing = false;
let typingDotsInterval = null;

// Auto-resize textarea
userInput.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
});

// Enter-to-send (Shift+Enter for new line)
userInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Send button click handler
sendButton.addEventListener("click", sendMessage);

// Show typing dots
function showTypingIndicator() {
  typingIndicator.classList.add("visible");
  let dots = 0;
  typingDotsInterval = setInterval(() => {
    dots = (dots + 1) % 4;
    typingIndicator.textContent = "Teacher is thinking" + ".".repeat(dots);
  }, 500);
}

// Hide typing dots
function hideTypingIndicator() {
  clearInterval(typingDotsInterval);
  typingIndicator.classList.remove("visible");
  typingIndicator.textContent = "Teacher is thinking";
}

// Add message with fade-in
function addMessageToChat(role, content) {
  const messageEl = document.createElement("div");
  messageEl.className = `message ${role}-message`;
  messageEl.innerHTML = `<p>${content}</p>`;
  messageEl.style.opacity = 0;
  chatMessages.appendChild(messageEl);

  // Fade-in
  requestAnimationFrame(() => {
    messageEl.style.transition = "opacity 0.3s ease";
    messageEl.style.opacity = 1;
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Main send function
async function sendMessage() {
  const message = userInput.value.trim();
  if (!message || isProcessing) return;

  isProcessing = true;
  userInput.disabled = true;
  sendButton.disabled = true;

  addMessageToChat("user", message);
  userInput.value = "";
  userInput.style.height = "auto";

  chatHistory.push({ role: "user", content: message });

  showTypingIndicator();

  try {
    const assistantMessageEl = document.createElement("div");
    assistantMessageEl.className = "message assistant-message";
    assistantMessageEl.innerHTML = "<p></p>";
    chatMessages.appendChild(assistantMessageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory }),
    });

    if (!response.ok) throw new Error("Failed to get response");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let responseText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const jsonData = JSON.parse(line);
          if (jsonData.response) {
            responseText += jsonData.response;
            assistantMessageEl.querySelector("p").textContent = responseText;
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
        } catch (e) {
          console.error("JSON parse error:", e);
        }
      }
    }

    chatHistory.push({ role: "assistant", content: responseText });
  } catch (error) {
    console.error("Error:", error);
    addMessageToChat("assistant", "⚠️ Sorry, there was an error processing your request.");
  } finally {
    hideTypingIndicator();
    isProcessing = false;
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
  }
}
