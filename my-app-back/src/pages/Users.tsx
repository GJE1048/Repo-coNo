import { useEffect, useState } from "react";
import { 
  Search, 
  Loader2,
  Pencil,
  Trash2
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "../components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { trpc } from "../lib/api";
import type { User } from "../types";
import { Input } from "../components/ui/input";
import { Modal } from "../components/ui/modal";

export function Users() {
  const utils = trpc.useUtils();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { data, isLoading: loading, error } = trpc.admin.getUsers.useQuery(
    { page, limit, search },
    {     
      staleTime: 1000 * 30, // 30 秒内不重新请求
    }
  );
  const createUserMutation = trpc.admin.createUser.useMutation({
    onSuccess: () => utils.admin.getUsers.invalidate(),
  });
  const updateUserMutation = trpc.admin.updateUser.useMutation({
    onSuccess: () => utils.admin.getUsers.invalidate(),
  });
  const deleteUserMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => utils.admin.getUsers.invalidate(),
  });

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const resolved = (() => {
    if (Array.isArray(data) && data[0]?.result?.data?.json) {
      return data[0].result.data.json as { data: User[]; total: number };
    }
    if (data && typeof data === "object" && "data" in (data as object)) {
      return data as { data: User[]; total: number };
    }
    return undefined;
  })();
  const users: User[] = resolved?.data ?? [];
  const total = resolved?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const toCsvValue = (value: string) => {
    const escaped = value.replace(/"/g, '""');
    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
  };

  const handleExport = () => {
    const header = ["id", "username", "clerkId", "createdAt", "imageUrl"];
    const rows = users.map((user) => [
      user.id,
      user.username,
      user.clerkId,
      user.createdAt,
      user.imageUrl,
    ]);
    const csv = [header.join(",")]
      .concat(rows.map((row) => row.map((value) => toCsvValue(String(value))).join(",")))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `users-page-${page}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleCreateUser = async () => {
    const email = newEmail.trim();
    const password = newPassword.trim();
    if (!email) {
      setMessage("Email is required.");
      return;
    }
    if (password && password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    try {
      await createUserMutation.mutateAsync({
        email,
        username: newUsername.trim() || undefined,
        firstName: newFirstName.trim() || undefined,
        lastName: newLastName.trim() || undefined,
        password: password || undefined,
      });
      setNewEmail("");
      setNewUsername("");
      setNewFirstName("");
      setNewLastName("");
      setNewPassword("");
      setShowCreate(false);
    } catch (createError) {
      console.error("Failed to create user", createError);
      setMessage("Failed to create user.");
    }
  };

  const openEditUser = (user: User) => {
    setEditUser(user);
    setEditUsername(user.username ?? "");
    setEditFirstName("");
    setEditLastName("");
    setEditPassword("");
  };

  const handleUpdateUser = async () => {
    if (!editUser) return;
    const username = editUsername.trim();
    const firstName = editFirstName.trim();
    const lastName = editLastName.trim();
    const password = editPassword.trim();
    if (password && password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    const payload: {
      userId: string;
      username?: string;
      firstName?: string;
      lastName?: string;
      password?: string;
    } = { userId: editUser.clerkId };
    if (username && username !== editUser.username) payload.username = username;
    if (firstName) payload.firstName = firstName;
    if (lastName) payload.lastName = lastName;
    if (password) payload.password = password;
    if (Object.keys(payload).length === 1) {
      setEditUser(null);
      return;
    }
    try {
      await updateUserMutation.mutateAsync(payload);
      setEditUser(null);
    } catch (updateError) {
      console.error("Failed to update user", updateError);
      setMessage("Failed to update user.");
    }
  };

  const openDeleteUser = (user: User) => {
    setDeleteTarget(user);
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUserMutation.mutateAsync({ userId: deleteTarget.clerkId });
      setDeleteTarget(null);
    } catch (deleteError) {
      console.error("Failed to delete user", deleteError);
      setMessage("Failed to delete user.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">
            Manage your application users and their permissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={users.length === 0}>
            Export
          </Button>
          <Button onClick={() => setShowCreate(true)}>Add User</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                A list of all registered users in your system.
              </CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search users..."
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pl-8"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex h-40 items-center justify-center text-sm text-red-500">
              Failed to load users: {error.message}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Clerk ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img
                            src={user.imageUrl}
                            alt={user.username}
                            className="h-9 w-9 rounded-full"
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{user.username}</span>
                            <span className="text-xs text-muted-foreground">
                              {user.id}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {user.clerkId}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">User</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-500 hover:bg-green-600">
                          Active
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditUser(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteUser(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Modal
        open={showCreate}
        title="Add User"
        onClose={() => setShowCreate(false)}
        actions={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium" htmlFor="modal-user-email">
              Email
            </label>
            <Input
              id="modal-user-email"
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="modal-user-username">
              Username
            </label>
            <Input
              id="modal-user-username"
              value={newUsername}
              onChange={(event) => setNewUsername(event.target.value)}
              placeholder="optional"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="modal-user-first-name">
                First Name
              </label>
              <Input
                id="modal-user-first-name"
                value={newFirstName}
                onChange={(event) => setNewFirstName(event.target.value)}
                placeholder="optional"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="modal-user-last-name">
                Last Name
              </label>
              <Input
                id="modal-user-last-name"
                value={newLastName}
                onChange={(event) => setNewLastName(event.target.value)}
                placeholder="optional"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="modal-user-password">
              Password (optional)
            </label>
            <Input
              id="modal-user-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="leave blank to auto-generate"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(editUser)}
        title="Edit User"
        onClose={() => setEditUser(null)}
        actions={
          <>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} disabled={updateUserMutation.isPending}>
              {updateUserMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium" htmlFor="modal-edit-username">
              Username
            </label>
            <Input
              id="modal-edit-username"
              value={editUsername}
              onChange={(event) => setEditUsername(event.target.value)}
              placeholder="optional"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="modal-edit-first-name">
                First Name
              </label>
              <Input
                id="modal-edit-first-name"
                value={editFirstName}
                onChange={(event) => setEditFirstName(event.target.value)}
                placeholder="optional"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="modal-edit-last-name">
                Last Name
              </label>
              <Input
                id="modal-edit-last-name"
                value={editLastName}
                onChange={(event) => setEditLastName(event.target.value)}
                placeholder="optional"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="modal-edit-password">
              Password (optional)
            </label>
            <Input
              id="modal-edit-password"
              type="password"
              value={editPassword}
              onChange={(event) => setEditPassword(event.target.value)}
              placeholder="leave blank to keep unchanged"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete User"
        onClose={() => setDeleteTarget(null)}
        actions={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete{" "}
          <span className="font-medium text-foreground">
            {deleteTarget?.username}
          </span>
          ? This cannot be undone.
        </p>
      </Modal>

      <Modal
        open={Boolean(message)}
        title="Notice"
        onClose={() => setMessage(null)}
        actions={
          <Button onClick={() => setMessage(null)}>
            OK
          </Button>
        }
      >
        <p className="text-sm text-muted-foreground">{message}</p>
      </Modal>
    </div>
  );
}
