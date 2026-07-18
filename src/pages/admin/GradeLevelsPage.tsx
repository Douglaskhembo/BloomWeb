import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import AddGradeModal, { GradeFormValue } from "@/components/modals/AddGradeModal";
import { SchoolApi } from "@/services/api";

interface GradeLevel { uuid: string; name: string; order: number; streams: number; active: boolean; }

const GradeLevelsPage = () => {
  const [grades, setGrades] = useState<GradeLevel[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<GradeLevel | null>(null);

  const load = () => SchoolApi.getGradeLevels().then(d => setGrades(Array.isArray(d) ? d : []));
  useEffect(() => { load(); }, []);

  const handleSave = async (v: GradeFormValue) => {
    if (editing) {
      await SchoolApi.updateGradeLevel(editing.uuid, v);
    } else {
      await SchoolApi.createGradeLevel(v);
    }
    setEditing(null);
    load();
  };

  const handleToggle = async (uuid: string) => {
    await SchoolApi.toggleGradeLevelStatus(uuid);
    load();
  };

  const handleDelete = async (uuid: string) => {
    await SchoolApi.deleteGradeLevel(uuid);
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Grade Levels</CardTitle>
          <CardDescription>Define all class levels for your school.</CardDescription>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setAddOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Grade
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Grade Name</TableHead>
              <TableHead className="text-center">Streams</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grades.map((g) => (
              <TableRow key={g.uuid}>
                <TableCell className="text-muted-foreground">{g.order}</TableCell>
                <TableCell className="font-medium">{g.name}</TableCell>
                <TableCell className="text-center">{g.streams}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={g.active ? "default" : "secondary"}>{g.active ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => handleToggle(g.uuid)}>
                      {g.active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(g); setAddOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(g.uuid)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {grades.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No grade levels yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <AddGradeModal
        open={addOpen}
        onOpenChange={(o) => { setAddOpen(o); if (!o) setEditing(null); }}
        defaultOrder={grades.length + 1}
        initialValues={editing ? { name: editing.name, order: editing.order, streams: editing.streams, status: editing.active ? "active" : "inactive" } : undefined}
        onSave={handleSave}
      />
    </Card>
  );
};

export default GradeLevelsPage;
