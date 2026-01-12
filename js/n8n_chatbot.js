// Load the base n8n chat styles
const baseLink = document.createElement('link');
baseLink.rel = 'stylesheet';
baseLink.href = 'css/n8n_chat.css';
document.head.appendChild(baseLink);

// Custom styles for the chatbot
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'css/n8n_custom.css';
document.head.appendChild(link);

// Helper to load a script dynamically
const loadScript = (src) => {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });
};

const initN8nChat = async () => {
    // 1. Create the chat container if it doesn't exist
    if (!document.getElementById('n8n-chat')) {
        const chatDiv = document.createElement('div');
        chatDiv.id = 'n8n-chat';
        document.body.appendChild(chatDiv);
    }

    try {
        // 2. Load Vue.js
        if (!window.Vue) {
            await loadScript('js/vue.global.js');
        }

        // 3. Shim CommonJS environment to capture n8n export
        // The n8n UMD script requires 'module.exports' to properly export the createChat function
        window.module = { exports: {} };
        window.exports = window.module.exports;
        window.require = function (name) {
            if (name === 'vue') return window.Vue;
            return null;
        };

        // 4. Load the n8n UMD script
        await loadScript('js/chat.umd.js');

        // 5. Retrieve the exported createChat function
        const n8nExport = window.module.exports;
        const createChat = n8nExport.createChat || (n8nExport.default && n8nExport.default.createChat);

        if (typeof createChat === 'function') {
            createChat({
                webhookUrl: 'https://mnauad.app.n8n.cloud/webhook/1e71004e-54cd-4f0b-8eee-99693246497c/chat',
                target: '#n8n-chat',
                mode: 'window',
                showWelcomeScreen: true,
                defaultLanguage: 'es',
                initialMessages: [
                    '¡Hola! 👋',
                    'Soy la IA de **Evokar**.',
                    '¿En qué puedo ayudarte hoy?'
                ],
                i18n: {
                    es: {
                        title: 'Evo asistente Inteligente',
                        subtitle: '',
                        footer: 'Desarrollado por Evokar AI',
                        getStarted: 'Iniciar chat',
                        inputPlaceholder: 'Escribe tu mensaje...',
                        closeButtonTooltip: 'Cerrar chat'
                    }
                }
            });
            console.log('n8n chatbot initialized.');
        } else {
            console.error('n8n createChat function not found in export:', n8nExport);
        }

    } catch (e) {
        console.error('Failed to initialize n8n chatbot:', e);
    }
};

// Initialize when DOM is ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initN8nChat();
} else {
    window.addEventListener('DOMContentLoaded', initN8nChat);
}
