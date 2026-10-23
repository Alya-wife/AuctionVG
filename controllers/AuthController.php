<?php
/**
 * AuthController - Menangani autentikasi dan manajemen akun admin
 */

require_once __DIR__ . '/BaseController.php';

class AuthController extends BaseController {

    public function login($payload) {
        $username = trim($payload['username'] ?? '');
        $password = trim($payload['password'] ?? '');

        if (!$username || !$password) {
            $this->jsonError('Username dan password wajib diisi');
        }

        $stmt = $this->pdo->prepare("SELECT id, username, password, name, role FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user || $user['password'] !== $password) {
            $this->jsonError('Username atau password salah.');
        }

        unset($user['password']);
        $this->jsonSuccess($user);
    }

    public function getGoogleConfig() {
        $configFile = __DIR__ . '/../config/google.php';
        $googleConfig = file_exists($configFile) ? require $configFile : [];
        $clientId = $googleConfig['client_id'] ?? '711651834929-ijkh41k8k47jaaags97dp8tiohipgji2.apps.googleusercontent.com';
        $this->jsonSuccess(['client_id' => $clientId]);
    }

    public function googleLogin($payload) {
        $credential = trim($payload['credential'] ?? '');
        if (!$credential) {
            $this->jsonError('Token kredensial Google tidak ditemukan.');
        }

        $configFile = __DIR__ . '/../config/google.php';
        $googleConfig = file_exists($configFile) ? require $configFile : [];
        $expectedClientId = $googleConfig['client_id'] ?? '711651834929-ijkh41k8k47jaaags97dp8tiohipgji2.apps.googleusercontent.com';

        // Verifikasi token via endpoint resmi Google tokeninfo
        $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($credential);
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $resp = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($httpCode !== 200 || !$resp) {
            $this->jsonError('Verifikasi token Google gagal: ' . ($curlErr ?: 'Token tidak valid'));
        }

        $tokenData = json_decode($resp, true);
        if (!is_array($tokenData) || empty($tokenData['email'])) {
            $this->jsonError('Data profil Google tidak valid atau email tidak tersedia.');
        }

        if (!empty($expectedClientId) && isset($tokenData['aud']) && $tokenData['aud'] !== $expectedClientId) {
            $this->jsonError('Client ID token tidak cocok dengan server.');
        }

                $googleId = $tokenData['sub'] ?? '';
        $email = strtolower(trim($tokenData['email']));
        $name = trim($tokenData['name'] ?? explode('@', $email)[0]);
        $avatar = $tokenData['picture'] ?? '';
        $SUPER_ADMIN_EMAIL = 'ravywhienelda@gmail.com';

        // 1. Cari berdasarkan google_id
        $user = null;
        if ($googleId) {
            $stmt = $this->pdo->prepare("SELECT id, username, password, name, email, google_id, avatar, role FROM users WHERE google_id = ? LIMIT 1");
            $stmt->execute([$googleId]);
            $user = $stmt->fetch();
            if ($user) {
                $role = ($email === $SUPER_ADMIN_EMAIL) ? 'Super Admin' : ($user['role'] ?: 'Admin');
                $up = $this->pdo->prepare("UPDATE users SET name = ?, avatar = ?, email = ?, role = ? WHERE id = ?");
                $up->execute([$name, $avatar, $email, $role, $user['id']]);
                $user['name'] = $name;
                $user['avatar'] = $avatar;
                $user['email'] = $email;
                $user['role'] = $role;
            }
        }

        // 2. Cari berdasarkan email
        if (!$user && $email) {
            $stmt = $this->pdo->prepare("SELECT id, username, password, name, email, google_id, avatar, role FROM users WHERE LOWER(email) = ? LIMIT 1");
            $stmt->execute([$email]);
            $user = $stmt->fetch();
            if ($user) {
                $role = ($email === $SUPER_ADMIN_EMAIL) ? 'Super Admin' : ($user['role'] ?: 'Admin');
                $up = $this->pdo->prepare("UPDATE users SET name = ?, avatar = ?, google_id = ?, role = ? WHERE id = ?");
                $up->execute([$name, $avatar, $googleId, $role, $user['id']]);
                $user['name'] = $name;
                $user['avatar'] = $avatar;
                $user['google_id'] = $googleId;
                $user['role'] = $role;
            }
        }

        // 3. Jika user belum terdaftar
        if (!$user) {
            if ($email === $SUPER_ADMIN_EMAIL) {
                // Auto-create Super Admin jika pertama kali login
                $cleanUsername = 'ravywhienelda';
                $dummyPass = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);
                $ins = $this->pdo->prepare("INSERT INTO users (username, password, name, email, google_id, avatar, role) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $ins->execute([$cleanUsername, $dummyPass, $name, $email, $googleId, $avatar, 'Super Admin']);
                $newId = (int)$this->pdo->lastInsertId();

                $user = [
                    'id'        => $newId,
                    'username'  => $cleanUsername,
                    'name'      => $name,
                    'email'     => $email,
                    'google_id' => $googleId,
                    'avatar'    => $avatar,
                    'role'      => 'Super Admin'
                ];
            } else {
                // Akun belum didaftarkan oleh Super Admin
                $this->jsonError('Akses ditolak: Akun Google (' . htmlspecialchars($email) . ') belum terdaftar. Silakan hubungi Super Admin (ravywhienelda@gmail.com) untuk mendaftarkan akun Anda.');
            }
        }

        unset($user['password']);
        if ($avatar && empty($user['avatar'])) {
            $user['avatar'] = $avatar;
        }

        $this->jsonSuccess($user);
    }

        private function requireSuperAdmin($payload = []) {
        $SUPER_ADMIN_EMAIL = 'ravywhienelda@gmail.com';
        $raw = file_get_contents('php://input');
        $json = json_decode($raw, true) ?: [];
        $email = strtolower(trim($payload['_auth_user'] ?? ($json['_auth_user'] ?? ($_POST['_auth_user'] ?? ''))));

        if ($email === $SUPER_ADMIN_EMAIL) {
            return true;
        }
        if ($email) {
            $stmt = $this->pdo->prepare("SELECT role FROM users WHERE LOWER(email) = ? LIMIT 1");
            $stmt->execute([$email]);
            $role = $stmt->fetchColumn();
            if ($role === 'Super Admin') {
                return true;
            }
        }
        $this->jsonError('Akses ditolak: Hanya Super Admin yang dapat mengakses menu ini.', 403);
    }

    public function getUsers() {
        $this->requireSuperAdmin();
        $stmt = $this->pdo->query("SELECT id, username, name, email, google_id, avatar, role, created_at FROM users ORDER BY (CASE WHEN LOWER(email) = 'ravywhienelda@gmail.com' OR role = 'Super Admin' THEN 1 ELSE 2 END), id ASC");
        $users = $stmt->fetchAll();
        $this->jsonSuccess($users);
    }

        public function saveUser($payload) {
        $this->requireSuperAdmin($payload);
        $SUPER_ADMIN_EMAIL = 'ravywhienelda@gmail.com';
        $id       = !empty($payload['id']) ? (int)$payload['id'] : null;
        $email    = strtolower(trim($payload['email'] ?? ''));
        $role     = trim($payload['role'] ?? 'Staff');

        if (!$email) {
            $this->jsonError('Email akun Google wajib diisi');
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->jsonError('Format email Google tidak valid');
        }

        // Hanya ada 2 role: Super Admin atau Staff
        $role = ($role === 'Super Admin') ? 'Super Admin' : 'Staff';

        // Akun utama selalu Super Admin
        if ($email === $SUPER_ADMIN_EMAIL) {
            $role = 'Super Admin';
        }

        $name = trim($payload['name'] ?? '');
        if (!$name) {
            $name = explode('@', $email)[0];
        }

        $username = trim($payload['username'] ?? '');
        if (!$username) {
            $username = preg_replace('/[^a-zA-Z0-9_]/', '', explode('@', $email)[0]);
            if (!$username) $username = 'user_' . substr(md5($email), 0, 6);
        }

        if ($id) {
            // Update
            $chk = $this->pdo->prepare("SELECT id FROM users WHERE LOWER(email) = ? AND id != ? LIMIT 1");
            $chk->execute([$email, $id]);
            if ($chk->fetch()) {
                $this->jsonError('Email Google ini sudah digunakan oleh akun lain');
            }

            $up = $this->pdo->prepare("UPDATE users SET email = ?, role = ? WHERE id = ?");
            $up->execute([$email, $role, $id]);
            $this->jsonSuccess([
                'id'    => $id,
                'email' => $email,
                'role'  => $role
            ]);
        } else {
            // Insert
            $chk = $this->pdo->prepare("SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1");
            $chk->execute([$email]);
            if ($chk->fetch()) {
                $this->jsonError('Email ' . $email . ' sudah terdaftar dalam sistem');
            }

            $origUser = $username;
            $counter = 1;
            while (true) {
                $uChk = $this->pdo->prepare("SELECT id FROM users WHERE LOWER(username) = ? LIMIT 1");
                $uChk->execute([strtolower($username)]);
                if (!$uChk->fetch()) break;
                $username = $origUser . '_' . $counter++;
            }

            $dummyPass = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);
            $ins = $this->pdo->prepare("INSERT INTO users (username, password, name, email, role) VALUES (?, ?, ?, ?, ?)");
            $ins->execute([$username, $dummyPass, $name, $email, $role]);
            $newId = (int)$this->pdo->lastInsertId();

            $this->jsonSuccess([
                'id'       => $newId,
                'username' => $username,
                'name'     => $name,
                'email'    => $email,
                'role'     => $role
            ]);
        }
    }

    public function deleteUser($payload) {
        $this->requireSuperAdmin($payload);
        $SUPER_ADMIN_EMAIL = 'ravywhienelda@gmail.com';
        $id = !empty($payload['id']) ? (int)$payload['id'] : 0;
        $email = strtolower(trim($payload['email'] ?? ''));
        $username = strtolower(trim($payload['username'] ?? ''));

        if (!$id && !$email && !$username) {
            $this->jsonError('ID, Email, atau Username pengguna wajib disertakan');
        }

        if ($id) {
            $stmt = $this->pdo->prepare("SELECT id, username, email, role FROM users WHERE id = ? LIMIT 1");
            $stmt->execute([$id]);
        } elseif ($email) {
            $stmt = $this->pdo->prepare("SELECT id, username, email, role FROM users WHERE LOWER(email) = ? LIMIT 1");
            $stmt->execute([$email]);
        } else {
            $stmt = $this->pdo->prepare("SELECT id, username, email, role FROM users WHERE LOWER(username) = ? LIMIT 1");
            $stmt->execute([$username]);
        }
        $target = $stmt->fetch();

        if (!$target) {
            $this->jsonError('Pengguna tidak ditemukan');
        }

        if (strtolower($target['email'] ?? '') === $SUPER_ADMIN_EMAIL || $target['role'] === 'Super Admin' || strtolower($target['username'] ?? '') === 'ravywhienelda') {
            $this->jsonError('Akun Super Admin tidak dapat dihapus');
        }

        $del = $this->pdo->prepare("DELETE FROM users WHERE id = ?");
        $del->execute([$target['id']]);
        $this->jsonSuccess(true);
    }
}
