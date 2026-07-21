let allPromos = [];

document.addEventListener('DOMContentLoaded', () => {
    loadPromos();
    initPromoForm();
});

async function loadPromos() {
    const container = document.getElementById('promoGrid');
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    
    try {
        allPromos = await API.getPromotions();
        
        if(allPromos.length === 0) {
            container.innerHTML = '<div style="text-align:center; color:var(--text-muted)">Tidak ada promosi.</div>';
            return;
        }
        
        container.className = 'inventory-grid'; // re-use grid class
        let html = '';
        allPromos.forEach(p => {
            html += `
                <div class="card-item" style="border-color:${p.active ? 'var(--primary)' : 'var(--border-color)'}; box-shadow:${p.active ? '0 0 15px rgba(79, 142, 247, 0.2)' : 'none'}">
                    <div class="card-img-wrap" style="height:150px;">
                        <img src="${p.image}" class="card-img" style="opacity:1" alt="${p.title}">
                        ${p.active ? '<div class="card-status-badge status-shipped">AKTIF</div>' : ''}
                    </div>
                    <div class="card-info">
                        <h3 class="card-title">${p.title}</h3>
                        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px; flex:1;">${p.description || '-'}</p>
                        <div class="card-actions">
                            <button onclick="editPromo('${p.id}')">Edit</button>
                            <button style="color:var(--status-shipment)" onclick="deletePromo('${p.id}')">Hapus</button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch(e) {
        container.innerHTML = '<div style="color:var(--status-shipment)">Gagal memuat.</div>';
    }
}

function initPromoForm() {
    document.getElementById('btnAddPromo').addEventListener('click', () => {
        document.getElementById('promoForm').reset();
        document.getElementById('promoId').value = '';
        document.getElementById('modalPromoTitle').textContent = 'Tambah Promosi Baru';
        UI.openModal('modalPromo');
    });
    
    document.getElementById('cancelPromoBtn').addEventListener('click', () => UI.closeModal('modalPromo'));
    
    document.getElementById('promoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            id: document.getElementById('promoId').value || undefined,
            title: document.getElementById('promoTitle').value,
            image: document.getElementById('promoImageUrl').value,
            description: document.getElementById('promoDesc').value,
            active: document.getElementById('promoActive').checked
        };
        
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        
        try {
            await API.savePromotion(data);
            UI.showToast('Promosi berhasil disimpan');
            UI.closeModal('modalPromo');
            loadPromos();
        } catch(e) {
            UI.showToast('Gagal menyimpan', 'error');
        } finally {
            btn.disabled = false;
        }
    });
}

window.editPromo = function(id) {
    const p = allPromos.find(x => x.id === id);
    if(!p) return;
    
    document.getElementById('promoId').value = p.id;
    document.getElementById('promoTitle').value = p.title;
    document.getElementById('promoImageUrl').value = p.image;
    document.getElementById('promoDesc').value = p.description || '';
    document.getElementById('promoActive').checked = p.active;
    
    document.getElementById('modalPromoTitle').textContent = 'Edit Promosi';
    UI.openModal('modalPromo');
}

window.deletePromo = async function(id) {
    if(confirm('Yakin ingin menghapus promosi ini?')) {
        try {
            await API.deletePromotion(id);
            UI.showToast('Promosi dihapus');
            loadPromos();
        } catch(e) {
            UI.showToast('Gagal menghapus', 'error');
        }
    }
}
