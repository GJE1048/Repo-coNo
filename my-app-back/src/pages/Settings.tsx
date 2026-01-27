import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { trpc } from "../lib/api";
import { Modal } from "../components/ui/modal";

type StoredAuth = {
  username: string;
  loggedInAt: string;
};

export function Settings() {
  const navigate = useNavigate();
  const [authInfo, setAuthInfo] = useState<StoredAuth | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const clearLogsMutation = trpc.admin.clearAdminLogs.useMutation({
    onSuccess: () => setMessage("Audit logs cleared."),
    onError: () => setMessage("Failed to clear audit logs."),
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("admin-auth");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as StoredAuth;
      setAuthInfo(parsed);
    } catch {
      setAuthInfo(null);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage administrative preferences and tools.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Admin Profile</CardTitle>
            <CardDescription>Current administrator session details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Username:</span>{" "}
              <span className="font-medium">{authInfo?.username ?? "admin"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Logged in at:</span>{" "}
              <span className="font-medium">
                {authInfo?.loggedInAt ? new Date(authInfo.loggedInAt).toLocaleString() : "Unknown"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin Actions</CardTitle>
            <CardDescription>Maintenance tasks for administrators.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/logs")}
            >
              View Audit Logs
            </Button>
            <Button
              variant="destructive"
              onClick={() => clearLogsMutation.mutate()}
              disabled={clearLogsMutation.isPending}
            >
              {clearLogsMutation.isPending ? "Clearing..." : "Clear Audit Logs"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Modal
        open={Boolean(message)}
        title="Notice"
        onClose={() => setMessage(null)}
        actions={<Button onClick={() => setMessage(null)}>OK</Button>}
      >
        <p className="text-sm text-muted-foreground">{message}</p>
      </Modal>
    </div>
  );
}
