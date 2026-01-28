import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { ADMIN_PASSWORD, ADMIN_USERNAME, useAuth } from '../lib/auth';
import { trpc } from '../lib/api';

type LocationState = {
  from?: {
    pathname: string;
  };
};

export function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const logLoginMutation = trpc.admin.logAdminLogin.useMutation();

  const from = (location.state as LocationState | null)?.from?.pathname ?? '/app';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const result = login(username, password);
    if (result.ok) {
      logLoginMutation.mutateAsync().catch(() => {});
      navigate(from, { replace: true });
      return;
    }
    setError(result.message ?? '登录失败，请重试。');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>管理员登录</CardTitle>
          <CardDescription>请输入账号密码后进入后台管理。</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="admin-username">
                账号
              </label>
              <Input
                id="admin-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                placeholder="请输入管理员账号"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="admin-password">
                密码
              </label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="请输入管理员密码"
              />
            </div>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <p className="text-xs text-muted-foreground">
              账号：{ADMIN_USERNAME}，密码：{ADMIN_PASSWORD}
            </p>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={!username || !password}
            >
              登录
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
