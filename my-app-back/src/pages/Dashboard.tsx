import { 
  FileText,
  LayoutDashboard,
  CheckCircle2,
  Users
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "../components/ui/card";
import { 
  Area, 
  AreaChart, 
  CartesianGrid, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from "recharts";
import { trpc } from "../lib/api";

export function Dashboard() {
  const { data, isLoading: loading, error } = trpc.admin.getDashboardData.useQuery();
  const logsQuery = trpc.admin.getAdminLogs.useQuery(
    { page: 1, limit: 5 },
    { keepPreviousData: true },
  );
  const resolved = (() => {
    if (Array.isArray(data) && data[0]?.result?.data?.json) {
      return data[0].result.data.json as {
        stats: {
          totalUsers: number;
          totalDocuments: number;
          activeDocuments: number;
          workspaceCount: number;
        };
        chartData: { name: string; total: number }[];
      };
    }
    if (data && typeof data === "object" && "stats" in (data as object)) {
      return data as {
        stats: {
          totalUsers: number;
          totalDocuments: number;
          activeDocuments: number;
          workspaceCount: number;
        };
        chartData: { name: string; total: number }[];
      };
    }
    return undefined;
  })();
  const stats = resolved?.stats;
  const chartData = resolved?.chartData ?? [];
  const logsResolved = (() => {
    const raw = logsQuery.data;
    if (Array.isArray(raw) && raw[0]?.result?.data?.json) {
      return raw[0].result.data.json as {
        data: { id: string; action: string; actor: string; createdAt: string | Date }[];
      };
    }
    if (raw && typeof raw === "object" && "data" in (raw as object)) {
      return raw as { data: { id: string; action: string; actor: string; createdAt: string | Date }[] };
    }
    return undefined;
  })();
  const recentLogs = logsResolved?.data ?? [];

  const statsItems = [
    {
      title: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "bg-blue-500",
      desc: "All users"
    },
    {
      title: "Total Documents",
      value: stats?.totalDocuments ?? 0,
      icon: FileText,
      color: "bg-orange-500",
      desc: "All time"
    },
    {
      title: "Active Documents",
      value: stats?.activeDocuments ?? 0,
      icon: CheckCircle2,
      color: "bg-green-500",
      desc: "Not archived"
    },
    {
      title: "Workspaces",
      value: stats?.workspaceCount ?? 0,
      icon: LayoutDashboard,
      color: "bg-purple-500",
      desc: "Active workspaces"
    },
  ];

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">
          Error: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsItems.map((item) => (
          <Card key={item.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {item.title}
              </CardTitle>
              <div className={`rounded-full p-2 text-white ${item.color}`}>
                <item.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-7 w-20 animate-pulse bg-muted rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{item.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {item.desc}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>
            Documents created in the last 7 days
          </CardDescription>
        </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#8884d8" 
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Admin Activity</CardTitle>
            <CardDescription>Latest actions performed by administrators.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {logsQuery.isLoading ? (
                <div className="h-24 animate-pulse rounded bg-muted" />
              ) : recentLogs.length === 0 ? (
                <div className="text-sm text-muted-foreground">No recent admin actions.</div>
              ) : (
                recentLogs.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{entry.action}</span>
                      <span className="text-xs text-muted-foreground">
                        {entry.actor}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
