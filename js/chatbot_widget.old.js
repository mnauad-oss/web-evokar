// Chatbot Widget Logic - Standalone

// 1. Create and Inject the HTML Structure
const injectChatbotHTML = () => {
    // Check if container already exists
    let chatbotContainer = document.getElementById("gemini-chatbot-container");

    // If it doesn't exist, create it
    if (!chatbotContainer) {
        chatbotContainer = document.createElement("div");
        chatbotContainer.id = "gemini-chatbot-container";
        document.body.appendChild(chatbotContainer);
    }

    // Only inject innerHTML if it's empty (to avoid overwriting if already initialized)
    if (chatbotContainer.innerHTML.trim() === "") {
        // Add FontAwesome for icons (if not present)
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
                        <img src="assets/logo.jpg" style="width:32px; height:32px; border-radius:50%; margin-right:10px; align-self:flex-end; object-fit:cover;">
                        <p>Hola, bienvenido a Evokar Producciones. 👋<br>¿En qué puedo ayudarte?</p>
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

// 2. Chat Logic
const initChatbot = () => {
    injectChatbotHTML();

    const toggler = document.getElementById("chatbot-toggler");
    const closeBtn = document.querySelector(".chat-close-btn");
    const chatbox = document.querySelector(".chatbox");
    const chatInput = document.querySelector(".chat-input textarea");
    const sendBtn = document.getElementById("send-btn");
    const body = document.body;

    if (!toggler) return; // Guard clause

    toggler.addEventListener("click", () => body.classList.toggle("show-chatbot"));
    closeBtn.addEventListener("click", () => body.classList.remove("show-chatbot"));

    const createChatLi = (message, className) => {
        const chatLi = document.createElement("li");
        chatLi.classList.add("chat", className);
        let chatContent = className === "outgoing"
            ? `<p>${message}</p>`
            : `<img src="assets/logo.jpg" style="width:32px; height:32px; border-radius:50%; margin-right:10px; align-self:flex-end; object-fit:cover;"><p>${message}</p>`;
        chatLi.innerHTML = chatContent;
        return chatLi;
    }

    const generateResponse = async (userMessage) => {
        // Placeholder for systemInstruction and API_URL, assuming they are defined elsewhere
        // For this example, let's define them locally or assume global scope
        const systemInstruction = `
        Eres el asistente virtual de 'Evokar Producciones'.
        Tus respuestas deben ser breves, elegantes y profesionales. 

        **INFORMACIÓN DE SERVICIOS:**
        (Usa la informacion de contexto: Bautizos/Eventos desde $300k foto, $150k video. Bodas $500k foto, $350k video).

        **PROTOCOLO DE DESCONOCIMIENTO:**
        - Si no sabes la respuesta, di: "No tengo esa información específica. Por favor déjame tu **Nombre, Teléfono, Correo y tu CONSULTA COMPLETA** para contactarte.".

        **PROTOCOLO 'QUIERO DEJAR UN MENSAJE':**
        - Si el usuario dice "quiero dejar un mensaje", "contactar", "dejar una consulta" o similar:
        - Responde: "Por favor ingresa tu Nombre, Correo y Número de Teléfono seguido de tu pregunta.".
        
        **PROTOCOLO DE CAPTURA DE DATOS (ESTRICTO):**
        - Pide al usuario: "Por favor ingresa tu Nombre, Teléfono y Correo separados por comas".
        - Identifica Nombre, Telefono y Email.
        - Genera el JSON oculto con campos separados:
        \`\`\`json
        ||GUARDAR_DATOS||{"nombre":"[Nombre]", "telefono":"[Telefono]", "email":"[Email]", "consulta":"[Consulta original]"}
        \`\`\`
        - TU RESPUESTA DE TEXTO DEBE SER **UNICAMENTE**: "El mensaje será respondido por Evokar y le enviarán un correo con la respuesta. ¿Tiene alguna otra duda?".
        - **IGNORA** la pregunta del cliente en este turno. Solo guarda.

        **PROTOCOLO "OTRA DUDA":**
        - Si el usuario responde "SÍ", pregunta en qué ayudar.
        - Si el usuario responde "NO", despídete.
        `;

        // Note: In a real implementation with global context, we would append the previous user message to the prompt to help the AI understand "the previous question".
        // For this standalone widget without backend history, we rely on the conversation history sent in 'messages' array if we were maintaining a full context loop.
        // Here we are only sending single-turn messages for simplicity in this demo. To support "previous question", we ideally need a 'chatHistory' array.

        // Let's implement a simple chatHistory for this session
        if (!window.chatHistory) window.chatHistory = [];
        window.chatHistory.push({ role: "user", content: userMessage });

        const requestOptions = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${typeof getSecret === 'function' ? getSecret() : ""}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemInstruction },
                    ...window.chatHistory.slice(-6) // Keep last 6 messages for context
                ],
                temperature: 0.7
            })
        };

        const incomingChatLi = createChatLi("Pensando...", "incoming");
        chatbox.appendChild(incomingChatLi);
        chatbox.scrollTo(0, chatbox.scrollHeight);

        try {
            // Add Timeout to Fetch (6 seconds)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                ...requestOptions,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const data = await response.json();
            if (!response.ok) throw new Error(data.error.message);

            let apiResponse = data.choices[0].message.content.trim();
            window.chatHistory.push({ role: "assistant", content: apiResponse });

            // Check for hidden SAVE protocol
            if (apiResponse.includes("||GUARDAR_DATOS||")) {
                try {
                    const parts = apiResponse.split("||GUARDAR_DATOS||");
                    const userText = parts[0].trim();
                    const jsonString = parts[1].replace(/```json/g, "").replace(/```/g, "").trim();
                    const contactData = JSON.parse(jsonString);

                    // AUTO-FORMAT PHONE NUMBER
                    if (contactData.telefono) {
                        let rawNums = contactData.telefono.replace(/\D/g, ""); // Strip non-digits
                        if (rawNums.startsWith("56")) {
                            contactData.telefono = "+" + rawNums;
                        } else {
                            contactData.telefono = "+56" + rawNums;
                        }
                    }

                    // Save to LocalStorage (Simulated Backend)
                    const existingInbox = JSON.parse(localStorage.getItem('admin_inbox') || "[]");
                    contactData.fecha = new Date().toLocaleString();
                    existingInbox.push(contactData);
                    localStorage.setItem('admin_inbox', JSON.stringify(existingInbox));

                    console.log("Nuevo Lead Capturado:", contactData);

                    // Force the STRICT text response locally if AI failed to obey
                    apiResponse = "El mensaje será respondido por Evokar y le enviarán un correo con la respuesta. ¿Tiene alguna otra duda?";

                    // Update state to expect strictly yes/no next
                    conversationState = "AWAITING_MORE_DOUBTS";

                } catch (e) {
                    console.error("Error parsing save data:", e);
                    // If parsing failed, show original text but don't hang
                    apiResponse = apiResponse.split("||GUARDAR_DATOS||")[0];
                }
            }

            incomingChatLi.querySelector("p").innerText = apiResponse;
        } catch (error) {
            console.warn("API Error (OpenAI), switching to Local Mock:", error);
            // Fallback to Local Mock AI if API fails
            const localResponse = generateLocalResponse(userMessage);

            if (localResponse.saveData) {
                try {
                    const existingInbox = JSON.parse(localStorage.getItem('admin_inbox') || "[]");

                    let contactInfo = localResponse.saveData.telefono || localResponse.saveData.contacto;
                    if (contactInfo) {
                        let rawNums = contactInfo.replace(/\D/g, "");
                        if (rawNums.startsWith("56")) {
                            localResponse.saveData.telefono = "+" + rawNums;
                        } else {
                            localResponse.saveData.telefono = "+56" + rawNums;
                        }
                    }

                    localResponse.saveData.fecha = new Date().toLocaleString();
                    existingInbox.push(localResponse.saveData);
                    localStorage.setItem('admin_inbox', JSON.stringify(existingInbox));
                    console.log("Nuevo Lead Capturado (Local):", localResponse.saveData);
                } catch (e) { console.error("Local save error", e); }
            }

            incomingChatLi.querySelector("p").innerText = localResponse.text;
        } finally {
            chatbox.scrollTo(0, chatbox.scrollHeight);
        }
    }

    // State management for conversation flow
    let pendingInquiry = "";
    let conversationState = "IDLE"; // IDLE, AWAITING_MORE_DOUBTS

    // Local rules engine to simulate AI when API is down
    const generateLocalResponse = (msg) => {
        const lowerMsg = msg.toLowerCase();

        // 0. CHECK STATE: Are we waiting for "Do you have another doubt?" confirmation?
        if (conversationState === "AWAITING_MORE_DOUBTS") {
            // Reset state after handling this
            conversationState = "IDLE";

            const affirmations = ["si", "sí", "claro", "por favor", "tengo otra", "otra duda"];
            const negations = ["no", "gracias", "listo", "eso es todo", "nada mas", "nada más", "chau", "no gracias"];

            if (negations.some(kw => lowerMsg.includes(kw))) {
                return { text: "Gracias por contactar a Evokar Producciones. ¡Hasta pronto! 👋" };
            }
            // Default to assuming they might want help if they didn't say no (or explicitly said yes)
            return { text: "Entendido, ¿qué más necesitas saber?" };
        }

        const hasEmail = /\S+@\S+\.\S+/.test(lowerMsg);
        // Improved Phone Regex: Look for 'telefono'/'celular' + digits OR just 8+ digits if keywords present
        const phoneDigits = lowerMsg.match(/\d{8,}/);
        const hasPhone = !!phoneDigits;
        // Expanded Keywords for Intent
        const hasContactIntent = lowerMsg.includes("telefono") || lowerMsg.includes("celular") || lowerMsg.includes("correo") || lowerMsg.includes("mail") || lowerMsg.includes("nombre") ||
            lowerMsg.includes("mensaje") || lowerMsg.includes("soy") || lowerMsg.includes("pregunta") || lowerMsg.includes("duda") || lowerMsg.includes("consulta");

        // 1. Data Capture Protocol
        // Catch if we have (Email AND Phone) OR (Phone AND Intent) OR (Email AND Intent) OR Just Phone if message is complex?
        // Let's be aggressive: If hasPhone is true, we almost certainly want to capture, unless it's just a number query (but user said "Matias, 9467...").
        // To be safe against "cuanto sale 9467 pesos", we ensure formatting or presence of name-like structure?
        // Let's stick to: If hasPhone AND (Intent OR hasEmail OR MessageLength > 15 chars (implies context))
        if ((hasEmail && hasPhone) || (hasPhone && hasContactIntent) || (hasEmail && hasContactIntent) || (hasPhone && lowerMsg.length > 20)) {
            // INTELLIGENT PARSING
            let parsedEmail = (msg.match(/\S+@\S+\.\S+/) || [""])[0];
            let parsedPhone = (msg.match(/\d{8,}/) || [""])[0];

            // Name: Remove email/phone/keywords
            let parsedName = msg.replace(parsedEmail, "").replace(parsedPhone, "").replace(/telefono|celular|correo|mail|nombre|soy|mi datos|hola|,|:/gi, "").trim();
            // Split by punctuation or newlines to isolate name from query
            parsedName = parsedName.split(/[.?!]|\n/)[0].trim();
            parsedName = parsedName.replace(/\s+/g, " ").substring(0, 30); // Clean spaces
            if (!parsedName) parsedName = "Cliente";

            if (parsedPhone) {
                let rawNums = parsedPhone.replace(/\D/g, "");
                if (rawNums.startsWith("56")) {
                    parsedPhone = "+" + rawNums;
                } else {
                    parsedPhone = "+56" + rawNums;
                }
            }

            // CLEAN INQUIRY: Remove the extracted data from the original message
            let cleanQuery = msg.replace(parsedEmail, "").replace(parsedPhone, "").replace(parsedName, "").trim();
            // Remove common separators at start
            cleanQuery = cleanQuery.replace(/^[,.\-:\s]+/, "");
            if (pendingInquiry) cleanQuery = pendingInquiry + " | " + cleanQuery;

            // Change State
            conversationState = "AWAITING_MORE_DOUBTS";

            return {
                text: "El mensaje será respondido por Evokar y le enviarán un correo con la respuesta. ¿Tiene alguna otra duda?",
                saveData: {
                    nombre: parsedName,
                    telefono: parsedPhone,
                    email: parsedEmail,
                    consulta: cleanQuery
                }
            };
        }

        // 2. Pricing & Services Rules
        // Bautizos y Eventos
        if (lowerMsg.includes("bautizo") || (lowerMsg.includes("evento") && !lowerMsg.includes("boda") && !lowerMsg.includes("corporativo"))) {
            if (lowerMsg.includes("hora") || lowerMsg.includes("duracion")) {
                let precioFoto = 300000;
                let precioVideo = 150000;
                return { text: `✨ **BAUTIZOS Y EVENTOS**:\n- **Fotografía**: Desde $${precioFoto.toLocaleString('es-CL')} (Cobertura por hora).\n- **Video**: Desde $${precioVideo.toLocaleString('es-CL')}.\n\nPara un presupuesto exacto, cuéntame más detalles.` };
            }
            pendingInquiry = msg; // Save this interaction as potential inquiry
            return { text: "🎉 **EVENTOS Y BAUTIZOS**:\n- Fotografía: Desde $300.000\n- Video: Desde $150.000\n\n¿Por cuántas horas necesitarías el servicio? (Mínimo 1 hora)." };
        }

        if (lowerMsg.includes("boda") || lowerMsg.includes("matrimonio")) {
            if (lowerMsg.includes("video")) return { text: "🎥 **VIDEO BODAS**:\nPrecio: $350.000 CLP.\nEntrega: Video editado de mínimo 10 minutos." };
            return { text: "📸 **FOTOGRAFÍA BODAS**:\nPrecio: $500.000 CLP.\nIncluye: 8 horas de cobertura y mínimo 1000 fotos.\n\nEl video tiene un valor de $350.000." };
        }

        if (lowerMsg.includes("corporativo") || lowerMsg.includes("empresa")) {
            return { text: "🏢 **SERVICIOS CORPORATIVOS**:\nPaquete completo (Foto + Video) por $1.000.000 CLP." };
        }

        if (lowerMsg.includes("precio") || lowerMsg.includes("valor") || lowerMsg.includes("cuánto") || lowerMsg.includes("cuanto")) {
            return { text: "Nuestros precios base son:\n- Bautizos/Eventos: Desde $300.000\n- Foto Boda: $500.000\n- Video Boda: $350.000\n- Corporativo: $1.000.000\n\n¿Qué evento estás planeando?" };
        }

        if (lowerMsg.includes("ubicacion") || lowerMsg.includes("donde")) {
            return { text: "Estamos ubicados en **Casablanca, Valparaíso**. 🍇" };
        }

        if (lowerMsg.includes("hola") || lowerMsg.includes("buenas")) {
            return { text: "¡Hola! Bienvenido a Evokar Producciones. ✨\nSoy tu asistente virtual. Pregúntame por precios de bodas, corporativos o agendar una cita." };
        }

        const contactKeywords = ["dejar mensaje", "dejar un mensaje", "enviar mensaje", "escribir mensaje", "contacto", "contactar", "hablar con administrativo", "quiero preguntar", "dejar nota", "quiero que me llamen", "dejar una consulta", "dejar consulta"];
        if (contactKeywords.some(kw => lowerMsg.includes(kw))) {
            return { text: "Claro. Por favor ingresa tu **Nombre, Correo y Número de Teléfono** seguido de tu pregunta para guardarlo en nuestra bandeja." };
        }

        // 3. Fallback / Unknown
        // Save this unknown message as the Pending Inquiry
        pendingInquiry = msg;
        return { text: "No tengo esa información específica en este momento. 🤔\nPor favor, responde con tu **Nombre, Teléfono, Correo y tu CONSULTA COMPLETA** para que administración te contacte." };
    };

    const handleChat = () => {
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;

        chatInput.value = "";

        // If we are in AWAITING_MORE_DOUBTS state and using Mock, handle locally immediately to skip API thinking time if preferred, 
        // OR let it go through generateResponse to attempt OpenAI First.
        // Given user request for reliable flow, let's force local check logic if state is active OR just let generateResponse handle it via fallback.
        // However, OpenAI doesn't know our local 'conversationState'. 
        // We should handle stateful logic locally primarily.

        chatbox.appendChild(createChatLi(userMessage, "outgoing"));
        chatbox.scrollTo(0, chatbox.scrollHeight);

        setTimeout(() => {
            // If local state is active, bypass OpenAI to keep the flow consistent
            if (conversationState !== "IDLE") {
                const localRes = generateLocalResponse(userMessage);
                const incomingLi = createChatLi(localRes.text, "incoming");
                chatbox.appendChild(incomingLi);
                chatbox.scrollTo(0, chatbox.scrollHeight);
                return;
            }
            generateResponse(userMessage);
        }, 600);
    }

    sendBtn.addEventListener("click", handleChat);
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleChat();
        }
    });
};

// Start
// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
} else {
    initChatbot();
}
