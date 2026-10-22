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

    public function getUsers() {
        $stmt = $this->pdo->query("SELECT id, username, password, name, role FROM users ORDER BY id ASC");
        $users = $stmt->fetchAll();
        $this->jsonSuccess($users);
    }

    public function saveUser($payload) {
        $username = trim($payload['username'] ?? '');
        $password = trim($payload['password'] ?? '');
        $name     = trim($payload['name'] ?? $username);
        $role     = trim($payload['role'] ?? 'Admin');

        if (!$username) {
            $this->jsonError('Username wajib diisi');
        }

        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1");
        $stmt->execute([$username]);
        $existing = $stmt->fetch();

        if ($existing) {
            // Update user
            if ($password !== '') {
                $up = $this->pdo->prepare("UPDATE users SET password = ?, name = ?, role = ? WHERE id = ?");
                $up->execute([$password, $name, $role, $existing['id']]);
            } else {
                $up = $this->pdo->prepare("UPDATE users SET name = ?, role = ? WHERE id = ?");
                $up->execute([$name, $role, $existing['id']]);
            }
            $this->jsonSuccess([
                'id'       => (int)$existing['id'],
                'username' => $username,
                'name'     => $name,
                'role'     => $role
            ]);
        } else {
            // Insert user
            $defPass = $password !== '' ? $password : '123456';
            $ins = $this->pdo->prepare("INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)");
            $ins->execute([$username, $defPass, $name, $role]);
            $newId = (int)$this->pdo->lastInsertId();
            $this->jsonSuccess([
                'id'       => $newId,
                'username' => $username,
                'name'     => $name,
                'role'     => $role
            ]);
        }
    }

    public function deleteUser($payload) {
        $username = trim($payload['username'] ?? '');
        if (!$username) {
            $this->jsonError('Username wajib diisi');
        }
        if (strtolower($username) === 'admin') {
            $this->jsonError('Admin utama tidak dapat dihapus');
        }
        $stmt = $this->pdo->prepare("DELETE FROM users WHERE LOWER(username) = LOWER(?)");
        $stmt->execute([$username]);
        $this->jsonSuccess(true);
    }
}
