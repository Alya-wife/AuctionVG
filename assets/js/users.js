let allUsers = [];

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    initUserEvents();
});

async function loadUsers() {
    const tbody = document.getElementById('userTableBody');
    try {
        allUsers = await API.request('getUsers');
        if (!Array.isArray(allUsers) || allUsers.length === 0) {
            allUsers = [
                { id: 1, username: 'admin', password: 'admin123', name: 'Pacar Alya', role: 'Pacar Alya' }
            ];
        }
        renderUsers();
    } catch (err) {
        console.error('Gagal memuat users:', err);
        UI.showToast('Gagal memuat data pengguna', 'error');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-danger); padding: 24px;">Gagal memuat data admin: ${err.message || 'Error koneksi'}</td></tr>`;
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
            (u.username && u.username.toLowerCase().includes(searchVal));
        const matchRole = !roleVal || (u.role === roleVal);
        return matchSearch && matchRole;
    });

    if (statTotal) statTotal.textContent = allUsers.length;
    if (badgeTotal) badgeTotal.textContent = `${filtered.length} dari ${allUsers.length} admin`;

    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 32px;">Tidak ada akun admin yang sesuai kriteria pencarian.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(u => {
        const initial = (u.name || u.username || 'A').charAt(0).toUpperCase();
        const roleClass = getRoleClass(u.role);
        const isMasterAdmin = (u.username || '').toLowerCase() === 'admin';

        return `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar-circle">${initial}</div>
                        <div class="user-cell-info">
                            <span class="user-cell-name">${escapeHtml(u.name || u.username)}</span>
                            <span class="user-cell-username">@${escapeHtml(u.username)}</span>
                        </div>
                    </div>
                </td>
                <td style="font-family: monospace; font-size: 0.85rem; color: #38bdf8;">
                    ${escapeHtml(u.username)}
                </td>
                <td>
                    <span class="badge-role ${roleClass}">${escapeHtml(u.role || 'Admin')}</span>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="user-pwd-mask" id="pwd-${u.id}" data-pwd="${escapeHtml(u.password || '')}" style="font-family: monospace; letter-spacing: 2px; color: var(--text-muted);">
                            ••••••••
                        </span>
                        <button type="button" class="btn-sm btn-ghost" onclick="toggleRevealPassword('${u.id}')" style="padding: 2px 6px; font-size: 0.72rem;" title="Lihat Password">
                            Lihat
                        </button>
                    </div>
                </td>
                <td style="text-align: right;">
                    <div style="display: flex; gap: 6px; justify-content: flex-end;">
                        <button class="btn-sm btn-ghost" onclick="editUser('${escapeHtml(u.username)}')" title="Edit Data">
                            Edit
                        </button>
                        ${isMasterAdmin ? `
                            <button class="btn-sm btn-ghost" disabled style="opacity: 0.4; cursor: not-allowed;" title="Admin utama tidak dapat dihapus">
                                Kunci
                            </button>
                        ` : `
                            <button class="btn-sm btn-danger" onclick="deleteUserAccount('${escapeHtml(u.username)}')" title="Hapus Admin">
                                Hapus
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getRoleClass(role) {
    if (!role) return 'badge-role-admin';
    const r = role.toLowerCase();
    if (r.includes('pacar')) return 'badge-role-pacar';
    if (r.includes('moderator')) return 'badge-role-moderator';
    if (r.includes('staff')) return 'badge-role-staff';
    return 'badge-role-admin';
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

window.toggleRevealPassword = function(userId) {
    const el = document.getElementById(`pwd-${userId}`);
    if (!el) return;
    const realPwd = el.getAttribute('data-pwd');
    if (el.textContent.includes('•')) {
        el.textContent = realPwd || '(kosong)';
        el.style.letterSpacing = 'normal';
        el.style.color = '#38bdf8';
    } else {
        el.textContent = '••••••••';
        el.style.letterSpacing = '2px';
        el.style.color = 'var(--text-muted)';
    }
};

function initUserEvents() {
    const searchInput = document.getElementById('userSearch');
    const roleFilter = document.getElementById('userRoleFilter');
    const btnAddUser = document.getElementById('btnAddUser');
    const modalClose = document.getElementById('modalUserClose');
    const cancelBtn = document.getElementById('cancelUserBtn');
    const form = document.getElementById('userForm');
    const togglePwd = document.getElementById('togglePasswordBtn');
    const pwdInput = document.getElementById('userPasswordInput');

    if (searchInput) searchInput.addEventListener('input', renderUsers);
    if (roleFilter) roleFilter.addEventListener('change', renderUsers);

    if (btnAddUser) {
        btnAddUser.addEventListener('click', () => {
            form.reset();
            document.getElementById('userOriginalUsername').value = '';
            document.getElementById('userUsernameInput').removeAttribute('readonly');
            document.getElementById('modalUserTitle').textContent = 'Tambah Admin Baru';
            document.getElementById('saveUserBtnText').textContent = 'Simpan Admin';
            UI.openModal('modalUser');
        });
    }

    if (modalClose) modalClose.addEventListener('click', () => UI.closeModal('modalUser'));
    if (cancelBtn) cancelBtn.addEventListener('click', () => UI.closeModal('modalUser'));

    if (togglePwd && pwdInput) {
        togglePwd.addEventListener('click', () => {
            const isPwd = pwdInput.type === 'password';
            pwdInput.type = isPwd ? 'text' : 'password';
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('saveUserBtn');
            const originalUser = document.getElementById('userOriginalUsername').value.trim();
            const username = document.getElementById('userUsernameInput').value.trim().toLowerCase();
            const name = document.getElementById('userNameInput').value.trim();
            const password = document.getElementById('userPasswordInput').value.trim();
            const role = document.getElementById('userRoleSelect').value;

            if (!username) {
                UI.showToast('Username wajib diisi!', 'error');
                return;
            }
            if (!password) {
                UI.showToast('Password wajib diisi!', 'error');
                return;
            }

            // Validasi duplikasi username saat create
            if (!originalUser && allUsers.some(u => u.username.toLowerCase() === username)) {
                UI.showToast(`Username "${username}" sudah digunakan, silakan pilih yang lain.`, 'error');
                return;
            }

            btn.disabled = true;
            const btnText = document.getElementById('saveUserBtnText');
            if (btnText) btnText.textContent = 'Menyimpan...';

            try {
                await API.request('saveUser', {
                    username: username,
                    name: name,
                    password: password,
                    role: role
                });

                UI.showToast(originalUser ? 'Data admin berhasil diperbarui' : 'Admin baru berhasil ditambahkan');
                UI.closeModal('modalUser');
                await loadUsers();
            } catch (err) {
                console.error(err);
                UI.showToast(err.message || 'Gagal menyimpan data admin', 'error');
            } finally {
                btn.disabled = false;
                if (btnText) btnText.textContent = 'Simpan Admin';
            }
        });
    }
}

window.editUser = function(username) {
    const user = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return;

    document.getElementById('userOriginalUsername').value = user.username;
    document.getElementById('userNameInput').value = user.name || user.username;
    document.getElementById('userUsernameInput').value = user.username;
    document.getElementById('userUsernameInput').setAttribute('readonly', 'true');
    document.getElementById('userPasswordInput').value = user.password || '';
    document.getElementById('userRoleSelect').value = user.role || 'Admin';

    document.getElementById('modalUserTitle').textContent = `Edit Admin (@${user.username})`;
    document.getElementById('saveUserBtnText').textContent = 'Perbarui Admin';

    UI.openModal('modalUser');
};

window.deleteUserAccount = async function(username) {
    if (!confirm(`Apakah Anda yakin ingin menghapus akun admin "@${username}"? Akses login akun ini akan dicabut.`)) {
        return;
    }

    try {
        await API.request('deleteUser', { username });
        UI.showToast(`Akun admin "@${username}" berhasil dihapus`);
        await loadUsers();
    } catch (err) {
        console.error(err);
        UI.showToast(err.message || 'Gagal menghapus admin', 'error');
    }
};
