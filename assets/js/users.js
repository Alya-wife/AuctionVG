let allUsers = [];
const SUPER_ADMIN_EMAIL = 'ravywhienelda@gmail.com';

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    initUserEvents();
});

async function loadUsers() {
    const tbody = document.getElementById('userTableBody');
    try {
        allUsers = await API.request('getUsers');
        if (!Array.isArray(allUsers)) allUsers = [];
        renderUsers();
    } catch (err) {
        console.error('Gagal memuat users:', err);
        UI.showToast('Gagal memuat data pengguna', 'error');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--color-danger); padding: 24px;">Gagal memuat data: ' + (err.message || 'Error koneksi') + '</td></tr>';
        }
    }
}

function renderUsers() {
    const searchVal = (document.getElementById('userSearch')?.value || '').toLowerCase().trim();
    const roleVal = document.getElementById('userRoleFilter')?.value || '';
    const tbody = document.getElementById('userTableBody');
    const badgeTotal = document.getElementById('userCountBadge');
    const statTotal = document.getElementById('statTotalUsers');

    const filtered = allUsers.filter(u => {
        const matchSearch = !searchVal || 
            (u.name && u.name.toLowerCase().includes(searchVal)) || 
            (u.email && u.email.toLowerCase().includes(searchVal)) ||
            (u.username && u.username.toLowerCase().includes(searchVal));
        const matchRole = !roleVal || (u.role === roleVal);
        return matchSearch && matchRole;
    });

    if (statTotal) statTotal.textContent = allUsers.length;
    if (badgeTotal) badgeTotal.textContent = filtered.length + ' dari ' + allUsers.length + ' akun';

    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 32px;">Tidak ada akun yang sesuai kriteria pencarian.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(u => {
        const email = (u.email || '').toLowerCase();
        const isSuperAdmin = (email === SUPER_ADMIN_EMAIL) || (u.role === 'Super Admin');
        const roleLabel = isSuperAdmin ? 'Super Admin' : 'Staff';
        const roleClass = isSuperAdmin ? 'badge-role-superadmin' : 'badge-role-staff';
        const initial = (u.name || u.email || 'U').charAt(0).toUpperCase();

        const avatarHtml = u.avatar 
            ? '<img src="' + escapeHtml(u.avatar) + '" alt="' + escapeHtml(u.name) + '" class="user-avatar-img" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;" referrerpolicy="no-referrer" />'
            : '<div class="user-avatar-circle">' + initial + '</div>';

        const statusHtml = u.google_id 
            ? '<span class="badge-status-linked"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Terhubung Google</span>'
            : '<span class="badge-status-pending"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Menunggu Login</span>';

        return '<tr>' +
            '<td>' +
                '<div class="user-cell">' +
                    avatarHtml +
                    '<div class="user-cell-info">' +
                        '<span class="user-cell-name">' + escapeHtml(u.name || (u.email ? u.email.split('@')[0] : 'Pengguna')) + '</span>' +
                        '<span class="user-cell-username">ID #' + u.id + '</span>' +
                    '</div>' +
                '</div>' +
            '</td>' +
            '<td>' +
                '<div style="display: flex; align-items: center; gap: 6px;">' +
                    '<span style="font-family: monospace; font-size: 0.88rem; color: #38bdf8;">' + escapeHtml(u.email || '(Belum disetel)') + '</span>' +
                '</div>' +
            '</td>' +
            '<td>' +
                '<span class="badge-role ' + roleClass + '">' + roleLabel + '</span>' +
            '</td>' +
            '<td>' +
                statusHtml +
            '</td>' +
            '<td style="text-align: right;">' +
                '<div style="display: flex; gap: 6px; justify-content: flex-end;">' +
                    '<button class="btn-sm btn-ghost" onclick="editUser(' + u.id + ')" title="Edit Pengguna">Edit</button>' +
                    (isSuperAdmin 
                        ? '<button class="btn-sm btn-ghost" disabled style="opacity: 0.5; cursor: not-allowed;" title="Super Admin utama tidak dapat dihapus">Utama</button>'
                        : '<button class="btn-sm btn-danger" onclick="deleteUserAccount(' + u.id + ', \'' + escapeHtml(u.email || u.name || u.username) + '\')" title="Hapus Akses">Hapus</button>'
                    ) +
                '</div>' +
            '</td>' +
        '</tr>';
    }).join('');
}

function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[m]));
}

function initUserEvents() {
    const searchInput = document.getElementById('userSearch');
    const roleFilter = document.getElementById('userRoleFilter');
    const btnAddUser = document.getElementById('btnAddUser');
    const modalClose = document.getElementById('modalUserClose');
    const cancelBtn = document.getElementById('cancelUserBtn');
    const form = document.getElementById('userForm');

    if (searchInput) searchInput.addEventListener('input', renderUsers);
    if (roleFilter) roleFilter.addEventListener('change', renderUsers);

    if (btnAddUser) {
        btnAddUser.addEventListener('click', () => {
            form.reset();
            document.getElementById('userIdInput').value = '';
            document.getElementById('userRoleSelect').removeAttribute('disabled');
            document.getElementById('userRoleSelect').value = 'Staff';
            document.getElementById('modalUserTitle').textContent = 'Tambah Pengguna Baru';
            document.getElementById('saveUserBtnText').textContent = 'Simpan Pengguna';
            UI.openModal('modalUser');
        });
    }

    if (modalClose) modalClose.addEventListener('click', () => UI.closeModal('modalUser'));
    if (cancelBtn) cancelBtn.addEventListener('click', () => UI.closeModal('modalUser'));

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('saveUserBtn');
            const id = document.getElementById('userIdInput').value.trim();
            const email = document.getElementById('userEmailInput').value.trim().toLowerCase();
            const role = document.getElementById('userRoleSelect').value;

            if (!email) {
                UI.showToast('Email Akun Google wajib diisi!', 'error');
                return;
            }

            btn.disabled = true;
            const btnText = document.getElementById('saveUserBtnText');
            if (btnText) btnText.textContent = 'Menyimpan...';

            try {
                await API.request('saveUser', {
                    id: id ? parseInt(id, 10) : null,
                    email: email,
                    role: role
                });

                UI.showToast(id ? 'Data pengguna berhasil diperbarui' : 'Pengguna baru berhasil ditambahkan');
                UI.closeModal('modalUser');
                await loadUsers();
            } catch (err) {
                console.error(err);
                UI.showToast(err.message || 'Gagal menyimpan data pengguna', 'error');
            } finally {
                btn.disabled = false;
                if (btnText) btnText.textContent = 'Simpan Pengguna';
            }
        });
    }
}

window.editUser = function(userId) {
    const user = allUsers.find(u => u.id == userId);
    if (!user) return;

    const email = (user.email || '').toLowerCase();
    const isSuperAdmin = (email === SUPER_ADMIN_EMAIL) || (user.role === 'Super Admin');

    document.getElementById('userIdInput').value = user.id;
    document.getElementById('userEmailInput').value = user.email || '';
    document.getElementById('userRoleSelect').value = isSuperAdmin ? 'Super Admin' : (user.role === 'Super Admin' ? 'Super Admin' : 'Staff');

    if (isSuperAdmin && email === SUPER_ADMIN_EMAIL) {
        document.getElementById('userRoleSelect').setAttribute('disabled', 'true');
    } else {
        document.getElementById('userRoleSelect').removeAttribute('disabled');
    }

    document.getElementById('modalUserTitle').textContent = 'Edit Pengguna: ' + (user.email || user.name);
    document.getElementById('saveUserBtnText').textContent = 'Perbarui Pengguna';

    UI.openModal('modalUser');
};

window.deleteUserAccount = async function(userIdOrUsername, label) {
    let payload = {};
    if (typeof userIdOrUsername === 'number' || !isNaN(parseInt(userIdOrUsername, 10))) {
        payload.id = parseInt(userIdOrUsername, 10);
    } else {
        payload.username = userIdOrUsername;
    }

    const userObj = allUsers.find(u => u.id == payload.id || u.username === payload.username);
    if (userObj) {
        payload.id = userObj.id;
        if (userObj.email) payload.email = userObj.email;
        if (userObj.username) payload.username = userObj.username;
        if (!label) label = userObj.email || userObj.name || userObj.username;
    }

    if (!confirm('Apakah Anda yakin ingin menghapus akses untuk "' + (label || 'pengguna ini') + '"?\n\nPengguna ini tidak akan bisa login lagi ke sistem.')) {
        return;
    }

    try {
        await API.request('deleteUser', payload);
        UI.showToast('Akses pengguna berhasil dihapus');
        await loadUsers();
    } catch (err) {
        console.error(err);
        UI.showToast(err.message || 'Gagal menghapus pengguna', 'error');
    }
};
