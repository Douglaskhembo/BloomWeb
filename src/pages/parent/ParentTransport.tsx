import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bus, MapPin, Clock, Phone } from "lucide-react";

const ParentTransport = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transport</h1>
        <p className="text-muted-foreground">Bus route and pickup details for Joy Kamau</p>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Bus className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Route B - Langata</h2>
              <p className="text-sm text-muted-foreground">Vehicle: KCA 456B</p>
            </div>
            <Badge className="ml-auto">Active</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-card">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Morning Pickup</p>
                <p className="font-semibold text-sm">6:45 AM</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-card">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Evening Drop-off</p>
                <p className="font-semibold text-sm">4:30 PM</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-card">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Pickup Point</p>
                <p className="font-semibold text-sm">Langata Mall Gate</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-card">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Driver: Peter Ouma</p>
              <p className="font-semibold text-sm">+254 712 345 678</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParentTransport;
