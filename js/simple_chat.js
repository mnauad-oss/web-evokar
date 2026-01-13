// Chatbot Simple - Local Only (No AI/n8n)

const initSimpleChat = () => {
    // 1. Inject HTML Layout
    const injectChatbotHTML = () => {
        let chatbotContainer = document.getElementById("gemini-chatbot-container");
        if (!chatbotContainer) {
            chatbotContainer = document.createElement("div");
            chatbotContainer.id = "gemini-chatbot-container";
            document.body.appendChild(chatbotContainer);
        }

        if (chatbotContainer.innerHTML.trim() === "") {
            // Add FontAwesome if missing
            if (!document.querySelector("link[href*='font-awesome']")) {
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css";
                document.head.appendChild(link);
            }

            chatbotContainer.innerHTML = `
                <button id="chatbot-toggler" style="overflow:hidden; padding:0; display:flex; justify-content:center; align-items:center;">
                    <img src="assets/logo.jpg" style="width:100%; height:100%; object-fit:cover;">
                </button>
                <div class="chatbot-popup">
                    <div class="chat-header">
                        <h2>Asistente Evokar</h2>
                        <button class="chat-close-btn"><i class="fas fa-times"></i></button>
                    </div>
                    <ul class="chatbox">
                        <li class="chat incoming">
                            <span class="bot-icon"><i class="fas fa-robot"></i></span>
                            <p>Hola, bienvenido a Evokar Producciones. 👋<br>¿Te ayudo con precios de Bodas, Retratos o Eventos?</p>
                        </li>
                    </ul>
                    <div class="chat-input">
                        <textarea placeholder="Escribe tu consulta..." required></textarea>
                        <button id="send-btn"><i class="fas fa-paper-plane"></i></button>
                    </div>
                </div>
            `;
        }
    };

    injectChatbotHTML();

    // Selectors scoped to the chatbot container to avoid conflict with Admin Modal
    const container = document.getElementById("gemini-chatbot-container");
    const toggler = container.querySelector("#chatbot-toggler");
    const closeBtn = container.querySelector(".chat-close-btn");
    const chatbox = container.querySelector(".chatbox");
    const chatInput = container.querySelector(".chat-input textarea");
    const sendBtn = container.querySelector("#send-btn");
    const body = document.body;

    if (!toggler) return;

    toggler.addEventListener("click", () => body.classList.toggle("show-chatbot"));
    closeBtn.addEventListener("click", () => body.classList.remove("show-chatbot"));

    // --- UI HELPERS ---
    const createChatLi = (message, className) => {
        const chatLi = document.createElement("li");
        chatLi.classList.add("chat", className);
        let chatContent;
        if (className === "outgoing") {
            chatContent = `<p>${message}</p>`;
        } else {
            chatContent = `<span class="bot-icon" style="flex-shrink:0; width:32px; height:32px; background:#d0d3d4; color:#000; display:flex; align-items:center; justify-content:center; border-radius:50%; margin-right:10px; align-self:flex-end;"><i class="fas fa-robot"></i></span><p>${message}</p>`;
        }
        chatLi.innerHTML = chatContent;
        return chatLi;
    }

    const appendOptions = (options) => {
        const li = document.createElement("li");
        li.classList.add("chat", "incoming");
        li.style.flexDirection = "column";
        li.style.alignItems = "flex-start";
        li.style.marginTop = "5px";

        const optionsDiv = document.createElement("div");
        optionsDiv.className = "chat-options";
        optionsDiv.style.display = "flex";
        optionsDiv.style.flexWrap = "wrap";
        optionsDiv.style.gap = "8px";
        optionsDiv.style.marginLeft = "42px";

        options.forEach(opt => {
            const btn = document.createElement("button");
            btn.textContent = opt.label;
            btn.style.padding = "8px 14px";
            btn.style.border = "1px solid #666";
            btn.style.borderRadius = "20px";
            btn.style.background = "rgba(0,0,0,0.3)";
            btn.style.color = "#fff";
            btn.style.cursor = "pointer";
            btn.style.fontSize = "0.85rem";
            btn.style.transition = "all 0.2s";

            btn.onmouseover = () => { btn.style.background = "#fff"; btn.style.color = "#000"; };
            btn.onmouseout = () => { btn.style.background = "rgba(0,0,0,0.3)"; btn.style.color = "#fff"; };

            btn.onclick = () => {
                const chatInput = container.querySelector(".chat-input textarea");
                chatInput.value = opt.text || opt.label;
                container.querySelector("#send-btn").click();
                optionsDiv.querySelectorAll("button").forEach(b => {
                    b.disabled = true;
                    b.style.opacity = "0.5";
                    b.style.cursor = "default";
                });
            };
            optionsDiv.appendChild(btn);
        });

        li.appendChild(optionsDiv);
        chatbox.appendChild(li);
        chatbox.scrollTo(0, chatbox.scrollHeight);
    };

    // --- LOGIC ENGINE (State Machine) ---
    let chatState = "GREETING";
    let intendedService = "";

    const isPositive = (text) => /\b(s[íi]|claro|bueno|ok|bien|acepto|por favor|dale|yes|obvio|perfecto)\b/i.test(text);
    const isNegative = (text) => /\b(no|negativo|cancelar|chao|adios|nada|nunca)\b/i.test(text);

    const showMainMenu = () => {
        chatState = "MENU";
        setTimeout(() => {
            appendOptions([
                { label: "Cotización", text: "Quiero una cotización" },
                { label: "Dudas", text: "Tengo dudas" },
                { label: "Muestras de trabajo", text: "Ver muestras" },
                { label: "Otras dudas", text: "Otras consultas" }
            ]);
        }, 500);
    };

    const generateResponse = (userMessage) => {
        const lowerMsg = userMessage.toLowerCase();

        // 1. STATE: CAPTURE DATA
        if (chatState === "CAPTURE_DATA") {
            chatState = "POST_CAPTURE";

            let nombre = "Cliente Chat";
            let email = "";
            let telefono = "";
            const emailMatch = userMessage.match(/[\w.-]+@[\w.-]+\.\w+/);
            if (emailMatch) email = emailMatch[0];
            const phoneMatch = userMessage.match(/\+?\d[\d\s-]{7,}/);
            if (phoneMatch) telefono = phoneMatch[0];
            const cleanMsg = userMessage;

            const formData = new FormData();
            formData.append('form-name', 'contact');
            formData.append('Nombre', nombre);
            formData.append('Teléfono', telefono);
            formData.append('email', email);
            formData.append('Mensaje', `[${intendedService}] Detalle: ${cleanMsg}`);
            formData.append('Origen', 'Chatbot');

            fetch('/', {
                method: 'POST',
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams(formData).toString()
            }).catch(e => console.error(e));

            return "¡Excelente! Hemos recibido tus datos. Alguien del equipo te contactará pronto. ¿Necesitas algo más?";
        }

        // 1.5. STATE: POST_CAPTURE
        if (chatState === "POST_CAPTURE") {
            if (isNegative(lowerMsg)) {
                chatState = "GREETING";
                return "¡Gracias a ti! Estaremos atentos a cualquier consulta. ¡Que tengas un gran día! 👋";
            } else if (isPositive(lowerMsg)) {
                chatState = "MENU";
                setTimeout(showMainMenu, 600);
                return "¡Claro! Aquí tienes nuestras opciones nuevamente:";
            } else {
                return "No entendí muy bien. ¿Necesitas algo más? (Responde Sí o No)";
            }
        }

        // 2. STATE: CONFIRM_QUOTE
        if (chatState === "CONFIRM_QUOTE") {
            if (isPositive(lowerMsg) || lowerMsg.includes("cotiza")) {
                chatState = "CAPTURE_DATA";
                return "¡Estupendo! Por favor, envíame en **un solo mensaje**:\n\n1. Tu Nombre, Teléfono y Correo\n2. Fecha del evento\n3. Horarios aproximados (Inicio - Fin)";
            } else if (isNegative(lowerMsg)) {
                chatState = "MENU";
                setTimeout(showMainMenu, 1500);
                return "Entendido. Volvamos al menú principal.";
            } else {
                return "Disculpa, no entendí si deseas la cotización. Responde **Sí** o **No**.";
            }
        }

        // 3. STATE: FALLBACK_ASK
        if (chatState === "FALLBACK_ASK") {
            if (isPositive(lowerMsg)) {
                chatState = "CAPTURE_DATA";
                intendedService = "Duda Escalada";
                return "Perfecto. Por favor déjanos tu **Nombre, Correo y tu duda detallada** aquí abajo.";
            } else if (isNegative(lowerMsg)) {
                chatState = "MENU";
                return "Está bien. ¿En qué más puedo ayudarte?";
            } else {
                return "No te entendí bien. ¿Quieres que le preguntemos a un administrador? (Responde Sí o No).";
            }
        }

        // 4. FLOW: MENU HANDLER
        if (chatState === "MENU" || chatState === "GREETING") {
            if (lowerMsg.includes("cotiza")) {
                chatState = "SUBMENU_QUOTES";
                setTimeout(() => appendOptions([
                    { label: "Matrimonios", text: "Matrimonios" },
                    { label: "Eventos Sociales", text: "Eventos Sociales" },
                    { label: "Corporativos", text: "Corporativos" }
                ]), 600);
                return "¿Qué tipo de evento estás planeando?";
            }
            if (lowerMsg.includes("duda") || lowerMsg.includes("consulta")) {
                chatState = "FALLBACK_ASK";
                return "Entiendo. No tengo respuesta inmediata para eso, pero podemos preguntársela a los administradores. ¿Te parece?";
            }
            if (lowerMsg.includes("muestra") || lowerMsg.includes("trabajo")) {
                chatState = "MENU";
                return "¡Claro! Puedes ver nuestro trabajo en la sección 'Portfolio' del menú principal de la web.";
            }
        }

        // 5. FLOW: SUBMENU QUOTES
        if (chatState === "SUBMENU_QUOTES") {
            if (lowerMsg.includes("matrimonio") || lowerMsg.includes("boda")) {
                chatState = "SUBMENU_WEDDING";
                setTimeout(() => appendOptions([
                    { label: "Solo Fotos", text: "Solo Fotos" },
                    { label: "Solo Video", text: "Solo Video" },
                    { label: "Fotos y Video", text: "Fotos y Video" }
                ]), 600);
                return "¡Qué emoción! 💍 ¿Qué servicio necesitas para tu boda?";
            }
            if (lowerMsg.includes("corporativo")) {
                intendedService = "Corporativo";
                chatState = "CONFIRM_QUOTE";
                return "Para empresas ofrecemos producción integral. ¿Te gustaría recibir una propuesta formal?";
            }
            if (lowerMsg.includes("social")) {
                intendedService = "Evento Social";
                chatState = "CONFIRM_QUOTE";
                return "Cubrimos todo tipo de eventos sociales. ¿Quieres una cotización?";
            }
        }

        // 6. FLOW: SUBMENU WEDDING
        if (chatState === "SUBMENU_WEDDING") {
            intendedService = `Matrimonio (${userMessage})`;
            chatState = "CONFIRM_QUOTE";
            return "Nuestros servicios incluyen: registro de preparación, ceremonia, sesión de novios, fotos sociales y fiesta. 📸🎥\n\n¿Quieres que te enviemos la cotización?";
        }

        // --- GLOBAL FALLBACK ---
        chatState = "FALLBACK_ASK";
        return "No tengo esta información a mano, pero podemos preguntársela a los administradores. ¿Te parece?";
    };

    const handleChat = () => {
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;

        chatInput.value = "";
        chatbox.appendChild(createChatLi(userMessage, "outgoing"));
        chatbox.scrollTo(0, chatbox.scrollHeight);

        setTimeout(() => {
            const responseText = generateResponse(userMessage);
            chatbox.appendChild(createChatLi(responseText, "incoming"));
            chatbox.scrollTo(0, chatbox.scrollHeight);
        }, 600);
    }

    // STARTUP
    const msgs = chatbox.querySelectorAll(".chat");
    if (msgs.length === 1) {
        showMainMenu();
    }

    sendBtn.addEventListener("click", handleChat);
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleChat();
        }
    });

}

// Init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSimpleChat);
} else {
    initSimpleChat();
}
