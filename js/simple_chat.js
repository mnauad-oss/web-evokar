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

    const toggler = document.getElementById("chatbot-toggler");
    const closeBtn = document.querySelector(".chat-close-btn");
    const chatbox = document.querySelector(".chatbox");
    const chatInput = document.querySelector(".chat-input textarea");
    const sendBtn = document.getElementById("send-btn");
    const body = document.body;

    if (!toggler) return;

    toggler.addEventListener("click", () => body.classList.toggle("show-chatbot"));
    closeBtn.addEventListener("click", () => body.classList.remove("show-chatbot"));

    const createChatLi = (message, className) => {
        const chatLi = document.createElement("li");
        chatLi.classList.add("chat", className);

        let chatContent;
        if (className === "outgoing") {
            chatContent = `<p>${message}</p>`;
        } else {
            // For incoming, check if we have a logo available or use icon
            chatContent = `<span class="bot-icon" style="width:32px; height:32px; background:#d0d3d4; color:#000; display:flex; align-items:center; justify-content:center; border-radius:50%; margin-right:10px; align-self:flex-end;"><i class="fas fa-robot"></i></span><p>${message}</p>`;
        }

        chatLi.innerHTML = chatContent;
        return chatLi;
    }

    // --- LOGIC ENGINE ---
    let conversationState = "IDLE"; // IDLE, CAPTURING_DATA
    let pendingInquiry = "";

    const generateResponse = (userMessage) => {
        const lowerMsg = userMessage.toLowerCase();

        // --- 1. STATE: CAPTURING DATA ---
        if (conversationState === "CAPTURING_DATA") {
            // Attempt to parse minimal data
            // We expect "Name, Phone, Email" roughly
            conversationState = "IDLE"; // Reset after capture attempt

            // Save to LocalStorage
            try {
                const existingInbox = JSON.parse(localStorage.getItem('admin_inbox') || "[]");

                // Simple heuristic parsing
                const saveData = {
                    fecha: new Date().toLocaleString(),
                    nombre: "Cliente Web",
                    telefono: "",
                    email: "",
                    consulta: pendingInquiry || "Consulta General"
                };

                // Extract email
                const emailMatch = userMessage.match(/\S+@\S+\.\S+/);
                if (emailMatch) saveData.email = emailMatch[0];

                // Extract potential phone
                const phoneMatch = userMessage.match(/\d{8,}/);
                if (phoneMatch) saveData.telefono = phoneMatch[0];

                // Name is harder, just take the whole string if short, or 'Cliente'
                const nameCandidate = userMessage.replace(saveData.email, "").replace(saveData.telefono, "").trim();
                if (nameCandidate.length > 2 && nameCandidate.length < 50) {
                    saveData.nombre = nameCandidate;
                }

                existingInbox.push(saveData);
                localStorage.setItem('admin_inbox', JSON.stringify(existingInbox));

                return "¡Gracias! Hemos guardado tus datos. Te contactaremos a la brevedad. ¿Necesitas saber algo más?";

            } catch (e) {
                console.error(e);
                return "Hubo un error guardando tus datos, pero he tomado nota. ¿En qué más puedo ayudarte?";
            }
        }

        // --- 2. KEYWORD RULES ---

        // Precios / Bodas
        if (lowerMsg.includes("precio") || lowerMsg.includes("valor") || lowerMsg.includes("cuanto sale") || lowerMsg.includes("costo")) {
            if (lowerMsg.includes("boda") || lowerMsg.includes("matrimonio")) {
                return "💍 **BODAS**:\n- Fotografía: $500.000 (8hrs, +1000 fotos).\n- Video: $350.000.\n- Pack Completo: Consultar descuentos.";
            }
            if (lowerMsg.includes("evento") || lowerMsg.includes("bautizo")) {
                return "🎉 **EVENTOS**:\n- Fotografía desde $300.000.\n- Video desde $150.000.";
            }
            return "Nuestros precios base:\n- Bodas: Foto $500k | Video $350k\n- Eventos: Desde $300k\n- Corporativo: $1M (Pack Full)\n\n¿Qué evento tienes?";
        }

        if (lowerMsg.includes("boda") || lowerMsg.includes("matrimonio")) {
            return "Las bodas son nuestra especialidad. Ofrecemos cobertura documental y artística. ¿Te gustaría ver nuestro portafolio o saber precios?";
        }

        // Corporativo
        if (lowerMsg.includes("corporativo") || lowerMsg.includes("empresa")) {
            return "🏢 **CORPORATIVO**:\nOfrecemos producción integral (Video + Foto + Aéreas) por $1.000.000. Ideal para marcas que buscan destacar.";
        }

        // Contacto Intent
        if (lowerMsg.includes("contacto") || lowerMsg.includes("llamar") || lowerMsg.includes("correo") || lowerMsg.includes("mensaje") || lowerMsg.includes("agendar") || lowerMsg.includes("cita")) {
            conversationState = "CAPTURING_DATA";
            pendingInquiry = "Solicitud de contacto inmediata";
            return "Claro. Por favor déjame tu **Nombre, Teléfono y Correo** en un solo mensaje para que te contactemos.";
        }

        // Ubicacion
        if (lowerMsg.includes("donde") || lowerMsg.includes("ubicacion") || lowerMsg.includes("ciudad")) {
            return "Estamos base en **Casablanca, Valparaíso**, pero cubrimos eventos en toda la región.";
        }

        // Greetings
        if (lowerMsg.includes("hola") || lowerMsg.includes("buenos")) {
            return "¡Hola! 👋 Soy el asistente de Evokar. ¿Buscas foto o video para tu evento?";
        }

        // Fallback
        pendingInquiry = userMessage; // Save context
        return "No estoy seguro de entender eso. ¿Podrías preguntar por 'precios', 'bodas' o pedir 'contacto' para hablar con un humano?";
    };


    const handleChat = () => {
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;

        // User Message
        chatInput.value = "";
        chatbox.appendChild(createChatLi(userMessage, "outgoing"));
        chatbox.scrollTo(0, chatbox.scrollHeight);

        // Bot Thinking Delay
        setTimeout(() => {
            const responseText = generateResponse(userMessage);
            chatbox.appendChild(createChatLi(responseText, "incoming"));
            chatbox.scrollTo(0, chatbox.scrollHeight);
        }, 600);
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
