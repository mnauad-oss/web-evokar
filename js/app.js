console.log("App Loaded");

// Navbar Scroll Effect
const nav = document.querySelector('.main-nav');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
});

// Smooth Scroll for Anchor Links (if not natively supported)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);

        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth'
            });
            // Update URL hash without jumping
            history.pushState(null, null, targetId);
        }
    });
});

// Admin Inbox Logic
const adminBtn = document.getElementById('admin-login-btn');
const adminModal = document.getElementById('admin-modal');
const adminClose = document.getElementById('admin-close-btn');
const inboxBody = document.getElementById('admin-inbox-body');
const noMessages = document.getElementById('no-messages');
const exportBtn = document.getElementById('export-excel-btn');

if (adminBtn) {
    adminBtn.addEventListener('click', () => {
        // Simple toggle for demo
        adminModal.style.pointerEvents = "auto";
        adminModal.style.opacity = "1";
        adminModal.style.transform = "translate(50%, 50%) scale(1)";
        loadMessages();
    });
}

if (adminClose) {
    adminClose.addEventListener('click', () => {
        adminModal.style.pointerEvents = "none";
        adminModal.style.opacity = "0";
        adminModal.style.transform = "translate(50%, 50%) scale(0.9)";
    });
}



window.deleteMessage = function (index) {
    if (!confirm("¿Borrar este mensaje?")) return;
    const messages = JSON.parse(localStorage.getItem('admin_inbox') || "[]");
    messages.splice(index, 1);
    localStorage.setItem('admin_inbox', JSON.stringify(messages));
    loadMessages();
}

function loadMessages() {
    const messages = JSON.parse(localStorage.getItem('admin_inbox') || "[]");
    inboxBody.innerHTML = "";

    if (messages.length > 0) {
        noMessages.style.display = 'none';
        messages.forEach((msg, index) => {
            const row = document.createElement('tr');
            row.style.borderBottom = "1px solid #222";
            row.innerHTML = `
                <td style="padding:10px;">${msg.fecha || '-'}</td>
                <td style="padding:10px;">${msg.nombre}</td>
                <td style="padding:10px;">${msg.telefono || msg.contacto || '-'}</td>
                <td style="padding:10px;">${msg.email || '-'}</td>
                <td style="padding:10px;">${msg.consulta}</td>
                <td style="padding:10px; text-align:center;">
                    <button onclick="window.deleteMessage(${index})" style="background:none; border:none; color:#ff4444; cursor:pointer;" title="Borrar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            inboxBody.appendChild(row);
        });
    } else {
        noMessages.style.display = 'block';
    }
}

if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        const messages = JSON.parse(localStorage.getItem('admin_inbox') || "[]");
        if (messages.length === 0) {
            alert("No hay datos para exportar.");
            return;
        }

        // CSV Header
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Fecha,Nombre,Telefono,Email,Consulta\r\n";

        messages.forEach(msg => {
            // Escape commas and quotes for CSV safety
            const safe = (text) => `"${(text || "").replace(/"/g, '""')}"`;

            const row = [
                safe(msg.fecha),
                safe(msg.nombre),
                safe(msg.telefono || msg.contacto),
                safe(msg.email),
                safe(msg.consulta)
            ].join(",");
            csvContent += row + "\r\n";
        });

        // Download Trigger
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const timestamp = new Date().toISOString().slice(0, 10);
        link.setAttribute("download", `leads_evokar_${timestamp}.csv`);
        document.body.appendChild(link); // Required for FF
        link.click();
        document.body.removeChild(link);
    });
}

// Tab Switching Logic (for index.html sections)
document.querySelectorAll('.category-tabs').forEach(tabContainer => {
    tabContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            // Remove active class from siblings
            const buttons = tabContainer.querySelectorAll('button');
            buttons.forEach(btn => btn.classList.remove('tab-active'));

            // Add to clicked
            e.target.classList.add('tab-active');

            // Optional: Logic to switch content could go here
            // For now, visual selection is handled
            console.log("Tab selected:", e.target.innerText);
        }
    });
});
