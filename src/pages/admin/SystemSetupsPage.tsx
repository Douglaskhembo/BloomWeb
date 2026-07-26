import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings2, GraduationCap, Landmark } from "lucide-react";
import { useNavigate } from "react-router-dom";

const setupCards = [
  {
    to: "/admin/setup-school",
    icon: GraduationCap,
    iconBg: "bg-info/10",
    iconColor: "text-info",
    title: "School",
    description: "School bio data, grade levels, and class structure",
    activeCount: 11,
    totalCount: 11,
    totalLabel: "grades",
  },
  {
    to: "/admin/setup-banks",
    icon: Landmark,
    iconBg: "bg-success/10",
    iconColor: "text-success",
    title: "Banks & Mobile Money",
    description: "Master list of banks and mobile money providers (M-Pesa, Airtel Money) for payroll disbursement",
  },
];

const SystemSetupsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Setups</h1>
        <p className="text-muted-foreground">Configure system-wide settings and reference data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {setupCards.map((card) => (
          <Card
            key={card.to}
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
            onClick={() => navigate(card.to)}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${card.iconBg}`}>
                  <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{card.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
                  <div className="flex gap-2 mt-3">
                    {card.activeCount !== undefined && (
                      <Badge variant="outline" className="text-[10px]">{card.activeCount} active</Badge>
                    )}
                    {card.totalCount !== undefined && (
                      <Badge variant="secondary" className="text-[10px]">{card.totalCount} {card.totalLabel}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="border-dashed opacity-60">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-muted">
                <Settings2 className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-muted-foreground">More Setups</h3>
                <p className="text-sm text-muted-foreground mt-1">Additional system configurations coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemSetupsPage;
