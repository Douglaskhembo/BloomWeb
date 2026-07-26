import { useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Wallet, CreditCard } from "lucide-react";

const TABS = [
  { value: "payroll", path: "/admin/payroll", label: "Payroll Run", icon: DollarSign },
  { value: "salaries", path: "/admin/staff-salaries", label: "Staff Salaries", icon: Wallet },
  { value: "payment", path: "/admin/staff-payment-details", label: "Payment Details", icon: CreditCard },
];

/** Shared tab bar linking the three payroll-related pages, so it's clear they're one workflow. */
const PayrollNavTabs = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const active = TABS.find((t) => location.pathname.startsWith(t.path))?.value ?? "payroll";

  return (
    <Tabs value={active} onValueChange={(v) => {
      const tab = TABS.find((t) => t.value === v);
      if (tab) navigate(tab.path);
    }}>
      <TabsList>
        {TABS.map(({ value, label, icon: Icon }) => (
          <TabsTrigger key={value} value={value} className="gap-1.5">
            <Icon className="w-3.5 h-3.5" /> {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

export default PayrollNavTabs;
