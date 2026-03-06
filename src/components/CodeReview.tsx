import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { Code2, Eye, CheckCircle, Loader2 } from "lucide-react";

interface Submission {
  id: string;
  user_id: string;
  language: string;
  code: string;
  output: string | null;
  status: string;
  grade: string | null;
  feedback: string | null;
  created_at: string;
  student_name?: string;
  student_email?: string;
}

export default function CodeReview() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    const { data, error } = await supabase
      .from("code_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load submissions");
      setLoading(false);
      return;
    }

    // Fetch student profiles for names
    const userIds = [...new Set((data ?? []).map((s: any) => s.user_id))];
    let profileMap: Record<string, { full_name: string; email: string }> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      (profiles ?? []).forEach((p: any) => {
        profileMap[p.user_id] = { full_name: p.full_name, email: p.email };
      });
    }

    const enriched = (data ?? []).map((s: any) => ({
      ...s,
      student_name: profileMap[s.user_id]?.full_name || "Unknown",
      student_email: profileMap[s.user_id]?.email || "",
    }));

    setSubmissions(enriched);
    setLoading(false);
  };

  const openReview = (sub: Submission) => {
    setSelected(sub);
    setGrade(sub.grade || "");
    setFeedback(sub.feedback || "");
  };

  const handleGrade = async () => {
    if (!selected) return;
    if (!grade.trim()) {
      toast.error("Please enter a grade");
      return;
    }
    setSaving(true);

    const { error } = await supabase
      .from("code_submissions")
      .update({ grade: grade.trim(), feedback: feedback.trim(), status: "graded" })
      .eq("id", selected.id);

    if (error) {
      toast.error("Failed to save grade");
    } else {
      toast.success("Submission graded!");
      setSelected(null);
      fetchSubmissions();
    }
    setSaving(false);
  };

  const statusBadge = (status: string) => {
    if (status === "graded") return <Badge className="bg-green-500/10 text-green-600 border-green-200">Graded</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Code2 className="w-5 h-5" />
            Student Code Submissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading submissions...</p>
          ) : submissions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No submissions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="w-20">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{sub.student_name}</p>
                          <p className="text-xs text-muted-foreground">{sub.student_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-foreground">{sub.language}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {format(new Date(sub.created_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>{statusBadge(sub.status)}</TableCell>
                      <TableCell className="font-semibold text-foreground">{sub.grade || "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openReview(sub)}>
                          <Eye className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="w-5 h-5" />
              Review: {selected?.student_name} — {selected?.language}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Submitted Code</Label>
                <pre className="bg-muted/50 border border-border rounded-lg p-4 text-sm font-mono overflow-auto max-h-64 text-foreground whitespace-pre-wrap">
                  {selected.code}
                </pre>
              </div>

              {selected.output && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Output</Label>
                  <pre className="bg-muted/50 border border-border rounded-lg p-3 text-sm font-mono overflow-auto max-h-32 text-foreground whitespace-pre-wrap">
                    {selected.output}
                  </pre>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade</Label>
                  <Input
                    id="grade"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="e.g. A+, 95/100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback">Feedback</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Write feedback for the student..."
                  rows={3}
                />
              </div>

              <Button onClick={handleGrade} disabled={saving} className="w-full">
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Save Grade
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
