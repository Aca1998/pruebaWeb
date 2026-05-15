const PASSWORD = "insairelec51";

// --- LÓGICA DE NAVEGACIÓN Y LOGIN ---
function checkLogin() {
    const input = document.getElementById('passwordInput').value;
    if (input === PASSWORD) {
        document.getElementById('loginScreen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('adminPanel').classList.remove('hidden');
            
            const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
            const hoy = new Date();
            const fechaStr = `${hoy.getDate()}-${meses[hoy.getMonth()]}-${hoy.getFullYear().toString().slice(-2)}`;
            document.getElementById('invoiceDate').innerText = fechaStr;
            
            renderClients();
            sortHistory(); 
        }, 300);
    } else {
        document.getElementById('errorMsg').style.display = 'block';
    }
}

function handleEnter(event) { if (event.key === 'Enter') checkLogin(); }

function logout() {
    document.getElementById('adminPanel').classList.add('hidden');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('loginScreen').style.opacity = '1';
    document.getElementById('passwordInput').value = '';
    document.getElementById('errorMsg').style.display = 'none';
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active-view'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('view-' + viewId).classList.add('active-view');
    document.getElementById('btn-' + viewId).classList.add('active');
}

// --- LÓGICA DE CLIENTES ---
let clients = JSON.parse(localStorage.getItem('aguayo_clients')) || [];
function saveClientsLocally() { localStorage.setItem('aguayo_clients', JSON.stringify(clients)); }

function addClient() {
    const name = document.getElementById('clientNameInput').value;
    const nif = document.getElementById('clientNifInput').value;
    const address = document.getElementById('clientAddressInput').value;

    if (!name || !nif) { alert("El nombre y el NIF son obligatorios."); return; }

    clients.push({ id: Date.now(), name: name, nif: nif, address: address || "" });
    saveClientsLocally();
    
    document.getElementById('clientNameInput').value = '';
    document.getElementById('clientNifInput').value = '';
    document.getElementById('clientAddressInput').value = '';
    renderClients();
}

function deleteClient(id) {
    if(confirm("¿Seguro que quieres borrar este cliente?")) {
        clients = clients.filter(client => client.id !== id);
        saveClientsLocally();
        renderClients();
    }
}

function renderClients() {
    const list = document.getElementById('clientsList');
    list.innerHTML = '';
    if (clients.length === 0) { list.innerHTML = '<p style="color: var(--gray); grid-column: 1 / -1;">No tienes clientes guardados aún.</p>'; return; }

    clients.forEach(client => {
        const card = document.createElement('div');
        card.className = 'client-card';
        card.innerHTML = `
            <h3>${client.name}</h3>
            <p><strong>NIF/CIF:</strong> ${client.nif}</p>
            <p><strong>Dirección:</strong> ${client.address}</p>
            <div class="client-actions">
                <button class="btn-invoice-client" onclick="createInvoiceForClient(${client.id})">📝 Hacer Documento</button>
                <button class="btn-delete" onclick="deleteClient(${client.id})">Borrar</button>
            </div>
        `;
        list.appendChild(card);
    });
}

function createInvoiceForClient(id) {
    const client = clients.find(c => c.id === id);
    if (client) {
        document.getElementById('invoiceClientName').innerText = client.name;
        document.getElementById('invoiceClientNif').innerText = client.nif;
        document.getElementById('invoiceClientAddress').innerText = client.address;
        showView('new-invoice');
    }
}

// --- LÓGICA DE LA FACTURA ---
let items = [];

function formatEuro(numero) {
    return numero.toFixed(2).replace('.', ',') + ' €';
}

function addItem() {
    const desc = document.getElementById('descInput').value;
    const qty = parseFloat(document.getElementById('qtyInput').value);
    const price = parseFloat(document.getElementById('priceInput').value);

    if (!desc) { alert("Por favor, escribe una descripción"); return; }
    if (isNaN(qty) || isNaN(price)) { alert("La cantidad y el precio deben ser números"); return; }

    items.push({ desc, qty, price });
    
    document.getElementById('descInput').value = '';
    document.getElementById('qtyInput').value = '1';
    document.getElementById('priceInput').value = '0.00';
    renderTable();
}

function deleteItem(index) {
    items.splice(index, 1);
    renderTable();
}

function toggleColumns() {
    const table = document.getElementById('mainInvoiceTable');
    if (document.getElementById('hideDetailsToggle').checked) {
        table.classList.add('hide-details-mode');
    } else {
        table.classList.remove('hide-details-mode');
    }
}

function changeDocType() {
    const tipo = document.getElementById('docTypeSelect').value;
    document.getElementById('docType').innerText = tipo;
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    const hideDetails = document.getElementById('hideDetailsToggle').checked;
    document.getElementById('th-price').style.display = hideDetails ? 'none' : 'table-cell';
    document.getElementById('th-total').style.display = hideDetails ? 'none' : 'table-cell';
    document.getElementById('th-desc').style.width = hideDetails ? '85%' : '55%';

    items.forEach((item, index) => {
        const totalLinea = item.qty * item.price;
        const precioText = item.price > 0 ? formatEuro(item.price) : '';
        const totalText = totalLinea > 0 ? formatEuro(totalLinea) : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="col-desc">${item.desc}</td>
            <td class="col-qty center">${item.qty.toString().replace('.', ',')}</td>
            <td class="col-price right" style="display: ${hideDetails ? 'none' : 'table-cell'};">${precioText}</td>
            <td class="col-total right" style="display: ${hideDetails ? 'none' : 'table-cell'};">${totalText}</td>
            <td class="hide-on-print right" data-html2canvas-ignore="true">
                <button class="btn-delete" onclick="deleteItem(${index})">X</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    calculateTotals();
}

function calculateTotals() {
    const ivaRate = parseFloat(document.getElementById('ivaSelect').value) / 100;
    const irpfRate = parseFloat(document.getElementById('irpfSelect').value) / 100;

    document.getElementById('ivaLabel').innerText = document.getElementById('ivaSelect').value;
    document.getElementById('irpfLabel').innerText = document.getElementById('irpfSelect').value;

    let base = 0;
    items.forEach(item => { base += (item.qty * item.price); });

    const iva = base * ivaRate;
    const irpf = base * irpfRate;
    const total = base + iva - irpf;

    document.getElementById('subtotal').innerText = formatEuro(base);
    document.getElementById('ivaAmount').innerText = formatEuro(iva);
    document.getElementById('irpfAmount').innerText = "-" + formatEuro(irpf);
    document.getElementById('total').innerText = formatEuro(total);

    const totalsGrid = document.getElementById('totalsGrid');
    if (irpfRate > 0) {
        document.getElementById('colIrpfHeader').style.display = 'block';
        document.getElementById('irpfAmount').style.display = 'block';
        totalsGrid.classList.add('has-irpf');
    } else {
        document.getElementById('colIrpfHeader').style.display = 'none';
        document.getElementById('irpfAmount').style.display = 'none';
        totalsGrid.classList.remove('has-irpf');
    }
}

async function generatePDF() {
    window.jsPDF = window.jspdf.jsPDF;
    const element = document.getElementById('invoice');
    const pdfButton = document.querySelector('.btn-pdf');
    
    const docType = document.getElementById('docType').innerText.trim().toUpperCase();
    
    pdfButton.innerText = "⏳ Generando PDF...";

    try {
        const canvas = await html2canvas(element, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${docType}_Instalaciones_Aguayo.pdf`);

        saveInvoiceToHistory();

    } catch (error) {
        console.error("Error al generar PDF: ", error);
        alert("Hubo un error al generar el PDF.");
    } finally {
        pdfButton.innerText = "📥 Generar y Descargar PDF";
    }
}

// ==========================================
// --- LÓGICA DEL HISTORIAL DE FACTURAS ---
// ==========================================
let invoiceHistory = JSON.parse(localStorage.getItem('aguayo_history')) || [];

function saveInvoiceToHistory() {
    const docType = document.getElementById('docType').innerText.trim().toUpperCase();
    const num = document.getElementById('invoiceNumber').innerText;
    const clientName = document.getElementById('invoiceClientName').innerText;
    const clientNif = document.getElementById('invoiceClientNif').innerText;
    const clientAddress = document.getElementById('invoiceClientAddress').innerText;
    const dateStr = document.getElementById('invoiceDate').innerText;
    const total = document.getElementById('total').innerText;
    
    // Guardamos los campos de configuración ocultos
    const iva = document.getElementById('ivaSelect').value;
    const irpf = document.getElementById('irpfSelect').value;
    const hideDetails = document.getElementById('hideDetailsToggle').checked;

    const timestamp = Date.now();

    const newInvoice = {
        id: timestamp,
        type: docType,
        number: num,
        client: clientName,
        clientNif: clientNif,
        clientAddress: clientAddress,
        date: dateStr,
        total: total,
        // Almacenamos todo el array de items tal y como está
        items: JSON.parse(JSON.stringify(items)),
        iva: iva,
        irpf: irpf,
        hideDetails: hideDetails
    };

    invoiceHistory.push(newInvoice);
    localStorage.setItem('aguayo_history', JSON.stringify(invoiceHistory));
    sortHistory();
}

function renderHistory(dataToRender = invoiceHistory) {
    const list = document.getElementById('historyList');
    if (!list) return;
    list.innerHTML = '';

    if (dataToRender.length === 0) {
        list.innerHTML = '<p style="color: var(--gray);">No hay documentos que coincidan con la búsqueda.</p>';
        return;
    }

    dataToRender.forEach(inv => {
        const card = document.createElement('div');
        card.className = 'history-card';
        
        let badgeColor = "var(--primary)";
        if (inv.type === "PRESUPUESTO") badgeColor = "var(--accent-color)";
        if (inv.type === "ALBARÁN" || inv.type === "ALBARAN") badgeColor = "#8b5cf6";

        card.innerHTML = `
            <div class="history-info">
                <h3 style="color: ${badgeColor};">${inv.type || 'FACTURA'} Nº: ${inv.number}</h3>
                <p><strong>Cliente:</strong> ${inv.client}</p>
                <p><strong>Fecha:</strong> ${inv.date}</p>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end;">
                <div class="history-total" style="margin-right: 15px;">${inv.total}</div>
                <button class="btn-load" onclick="loadInvoice(${inv.id})">🔄 Cargar y Descargar</button>
                <button class="btn-delete" onclick="deleteHistoryItem(${inv.id})">Borrar</button>
            </div>
        `;
        list.appendChild(card);
    });
}

function sortHistory() {
    const order = document.getElementById('historySort').value;
    const monthFilter = document.getElementById('historyMonth').value;

    let filteredHistory = [...invoiceHistory];

    // Aplicar filtro de mes
    if (monthFilter !== 'all') {
        filteredHistory = filteredHistory.filter(inv => {
            // Buscamos si la abreviatura del mes (ej: "oct") está en la fecha guardada
            return inv.date.toLowerCase().includes(monthFilter.toLowerCase());
        });
    }

    // Aplicar ordenación
    if (order === 'desc') {
        filteredHistory.sort((a, b) => b.id - a.id);
    } else {
        filteredHistory.sort((a, b) => a.id - b.id);
    }
    
    renderHistory(filteredHistory);
}

// Función para volver a cargar la factura completa
function loadInvoice(id) {
    const inv = invoiceHistory.find(i => i.id === id);
    if (!inv) return;

    // Verificamos si tiene los items (las nuevas lo tendrán)
    if (inv.items) {
        // Cargar las líneas
        items = JSON.parse(JSON.stringify(inv.items));
        
        // Cargar controles
        document.getElementById('docTypeSelect').value = inv.type || 'FACTURA';
        document.getElementById('ivaSelect').value = inv.iva || '21';
        document.getElementById('irpfSelect').value = inv.irpf || '0';
        document.getElementById('hideDetailsToggle').checked = inv.hideDetails || false;
        
        // Cargar textos en la hoja
        document.getElementById('docType').innerText = inv.type || 'FACTURA';
        document.getElementById('invoiceNumber').innerText = inv.number;
        document.getElementById('invoiceClientName').innerText = inv.client;
        document.getElementById('invoiceClientNif').innerText = inv.clientNif || '';
        document.getElementById('invoiceClientAddress').innerText = inv.clientAddress || '';
        document.getElementById('invoiceDate').innerText = inv.date;

        renderTable(); 
        showView('new-invoice');
        
        alert("¡Documento cargado! Revisa que todo esté correcto y pulsa 'Generar y Descargar PDF'.");
    } else {
        alert("Lo siento, este documento es muy antiguo y no guardó las líneas de detalle. Las próximas que guardes sí funcionarán.");
    }
}

function deleteHistoryItem(id) {
    if(confirm("¿Seguro que quieres borrar este registro del historial?")) {
        invoiceHistory = invoiceHistory.filter(inv => inv.id !== id);
        localStorage.setItem('aguayo_history', JSON.stringify(invoiceHistory));
        sortHistory();
    }
}