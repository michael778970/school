// DOM elements for Auth
const authContainer = document.getElementById("auth-container");
const chatContainer = document.getElementById("chat-container");
const authUsername = document.getElementById("auth-username");
const authPassword = document.getElementById("auth-password");
const loginButton = document.getElementById("login-button");
const signupButton = document.getElementById("signup-button");
const authMessage = document.getElementById("auth-message");
const logoutButton = document.getElementById("logout-button");

// DOM elements for Chat
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");

let chatHistory = [];
let isProcessing = false;

// Check if already logged in
if (localStorage.getItem("token")) {
  showChat();
} else {
  showAuth();
}

function showAuth() {
  authContainer.style.display = "block";
  chatContainer.style.display = "none";
}

function showChat() {
  authContainer.style.display = "none";
  chatContainer.style.display = "block";
}

// Login
loginButton.addEventListener("click", async () => {
  const username = authUsername.value.trim();
  const password = authPassword.value.trim();
  if (!username || !password) {
    authMessage.textContent = "Please fill in all fields.";
    return;
  }

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (res.ok) {
    const data = await res.json();
    localStorage.setItem("token", data.token);
    showChat();
  } else {
    authMessage.textContent = "Invalid login credentials.";
  }
});

// Signup
signupButton.addEventListener("click", async () => {
  const username = authUsername.value.trim();
  const password = authPassword.value.trim();
  if (!username || !password) {
    authMessage.textContent = "Please fill in all fields.";
    return;
  }

  const res = await fetch("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (res.ok) {
    const data = await res.json();
    localStorage.setItem("token", data.token);
    showChat();
  } else {
    authMessage.textContent = "Signup failed. Try another username.";
  }
});

// Logout
logoutButton.addEventListener("click", () => {
  localStorage.removeItem("token");
  showAuth();
});

// Auto-resize textarea
userInput.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
});

// Send message on Enter
userInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendButton.addEventListener("click", sendMessage);

async function sendMessage() {
  const message = userInput.value.trim();
  if (message === "" || isProcessing) return;

  isProcessing = true;
  userInput.disabled = true;
  sendButton.disabled = true;
  addMessageToChat("user", message);

  userInput.value = "";
  userInput.style.height = "auto";
  typingIndicator.classList.add("visible");

  chatHistory.push({ role: "user", content: message });

  try {
    const token = localStorage.getItem("token");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages: chatHistory }),
    });

    if (!res.ok) throw new Error("Failed to get response");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let responseText = "";

    const assistantMessageEl = document.createElement("div");
    assistantMessageEl.className = "message assistant-message";
    assistantMessageEl.innerHTML = "<p></p>";
    chatMessages.appendChild(assistantMessageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        try {
          const jsonData = JSON.parse(line);
          if (jsonData.response) {
            responseText += jsonData.response;
            assistantMessageEl.querySelector("p").textContent = responseText;
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
        } catch (e) {}
      }
    }

    chatHistory.push({ role: "assistant", content: responseText });
  } catch (err) {
    addMessageToChat("assistant", "Error: Could not process your request.");
  } finally {
    typingIndicator.classList.remove("visible");
    isProcessing = false;
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
  }
}

function addMessageToChat(role, content) {
  const messageEl = document.createElement("div");
  messageEl.className = `message ${role}-message`;
  messageEl.innerHTML = `<p>${content}</p>`;
  chatMessages.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
