import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { Upload, Trash2, Users, FileText, Plus, Circle } from "lucide-react";

interface FileRecord {
  id: string;
  title: string;
  description: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

interface StudentProfile {
  full_name: string;
  email: string;
  created_at: string;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/msword",
  "application/zip",
  "application/x-zip-compressed",
  "video/mp4",
];

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [filesRes, studentsRes] = await Promise.all([
      supabase.from("files").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("full_name, email, created_at").eq("role", "student").order("created_at", { ascending: false }),
    ]);

    setFiles((filesRes.data as FileRecord[]) ?? []);
    setStudents((studentsRes.data as StudentProfile[]) ?? []);
    setLoading(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !user) return;

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      toast.error("File type not allowed. Please upload PDF, DOCX, PPT, ZIP, or MP4.");
      return;
    }

    if (selectedFile.size > 524288000) {
      toast.error("File size must be under 500MB");
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    const filePath = `${user.id}/${Date.now()}-${selectedFile.name}`;

    setUploadProgress(30);

    const { error: uploadError } = await supabase.storage
      .from("study-materials")
      .upload(filePath, selectedFile);

    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setUploading(false);
      setUploadProgress(0);
      return;
    }

    setUploadProgress(70);

    const { error: dbError } = await supabase.from("files").insert({
      title: title.trim(),
      description: description.trim(),
      file_name: selectedFile.name,
      file_url: filePath,
      file_size: selectedFile.size,
      file_type: selectedFile.type,
      uploaded_by: user.id,
    });

    if (dbError) {
      toast.error("Failed to save file record");
      setUploading(false);
      setUploadProgress(0);
      return;
    }

    setUploadProgress(100);
    toast.success("File uploaded successfully!");

    setTitle("");
    setDescription("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploading(false);
    setUploadProgress(0);
    fetchData();
  };

  const handleDelete = async (file: FileRecord) => {
    const { error: storageError } = await supabase.storage.from("study-materials").remove([file.file_url]);
    if (storageError) {
      toast.error("Failed to delete file from storage");
      return;
    }

    const { error: dbError } = await supabase.from("files").delete().eq("id", file.id);
    if (dbError) {
      toast.error("Failed to delete file record");
      return;
    }

    toast.success("File deleted");
    fetchData();
  };

  return (
    <DashboardLayout>
      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upload" className="gap-2">
            <Plus className="w-4 h-4" /> Upload
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-2">
            <FileText className="w-4 h-4" /> Files
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-2">
            <Users className="w-4 h-4" /> Students
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Upload Study Material</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-4 max-w-lg">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 5 - Data Structures" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the material" rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">File (PDF, DOCX, PPT, ZIP, MP4 — max 500MB)</Label>
                  <Input
                    id="file"
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.pptx,.ppt,.doc,.zip,.mp4"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                    required
                  />
                </div>
                {uploading && (
                  <div className="space-y-1">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground">{uploadProgress}% uploaded</p>
                  </div>
                )}
                <Button type="submit" disabled={uploading || !selectedFile}>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload File"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Uploaded Files</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : files.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No files uploaded yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead className="hidden sm:table-cell">Size</TableHead>
                        <TableHead className="hidden md:table-cell">Date</TableHead>
                        <TableHead className="w-20">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{file.title}</p>
                              <p className="text-xs text-muted-foreground">{file.file_name}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">{formatBytes(file.file_size)}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">{format(new Date(file.created_at), "MMM d, yyyy")}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(file)} className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
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
        </TabsContent>

        <TabsContent value="students">
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display text-foreground">{students.length}</p>
                    <p className="text-sm text-muted-foreground">Total Students</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10 text-accent">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display text-foreground">{files.length}</p>
                    <p className="text-sm text-muted-foreground">Total Files</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-display">Registered Students</CardTitle>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No students registered yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="hidden sm:table-cell">Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-foreground">{s.full_name || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{s.email}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">{format(new Date(s.created_at), "MMM d, yyyy")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
