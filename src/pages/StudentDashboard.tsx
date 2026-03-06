import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, File, Film, Archive, Calendar, HardDrive, Bot, Code, ExternalLink, Code2 } from "lucide-react";
import CodeEditor from "@/components/CodeEditor";
import { format } from "date-fns";
import { toast } from "sonner";

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

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(type: string) {
  if (type.includes("pdf")) return <FileText className="w-5 h-5" />;
  if (type.includes("video") || type.includes("mp4")) return <Film className="w-5 h-5" />;
  if (type.includes("zip") || type.includes("archive")) return <Archive className="w-5 h-5" />;
  return <File className="w-5 h-5" />;
}

const aiToolsData = [
  {
    category: "AI Chatbots",
    color: "text-blue-600",
    tools: [
      { name: "ChatGPT", url: "https://chatgpt.com" },
      { name: "Claude", url: "https://claude.ai" },
      { name: "DeepSeek", url: "https://deepseek.com" },
      { name: "Gemini", url: "https://gemini.google.com" },
      { name: "Grok", url: "https://grok.com" },
      { name: "Meta AI", url: "https://ai.meta.com" },
      { name: "MS Copilot", url: "https://copilot.microsoft.com" },
      { name: "Perplexity", url: "https://perplexity.ai" },
    ],
  },
  {
    category: "AI Presentation",
    color: "text-orange-600",
    tools: [
      { name: "Beautiful.AI", url: "https://beautiful.ai" },
      { name: "Gamma", url: "https://gamma.app" },
      { name: "Pitch", url: "https://pitch.com" },
      { name: "Plus", url: "https://plus.com" },
      { name: "PopAI", url: "https://popai.pro" },
      { name: "Presentation.AI", url: "https://presentation.ai" },
      { name: "Slidesgo", url: "https://slidesgo.com" },
      { name: "Tome", url: "https://tome.app" },
    ],
  },
  {
    category: "AI Coding Assistance",
    color: "text-green-600",
    tools: [
      { name: "Askcodi", url: "https://askcodi.com" },
      { name: "Coder", url: "https://coder.com" },
      { name: "Cursor", url: "https://cursor.sh" },
      { name: "GitHub Copilot", url: "https://github.com/features/copilot" },
      { name: "Copilot", url: "https://copilot.microsoft.com" },
      { name: "Replit", url: "https://replit.com" },
      { name: "Tabnine", url: "https://tabnine.com" },
    ],
  },
  {
    category: "AI Email Assistance",
    color: "text-purple-600",
    tools: [
      { name: "Clippit.AI", url: "https://clippit.ai" },
      { name: "Friday", url: "https://friday.app" },
      { name: "Mailmaestro", url: "https://mailmaestro.com" },
      { name: "Shortwave", url: "https://shortwave.com" },
      { name: "Superhuman", url: "https://superhuman.com" },
    ],
  },
  {
    category: "AI Image Generation",
    color: "text-red-600",
    tools: [
      { name: "Adobe Firefly", url: "https://firefly.adobe.com" },
      { name: "DALL-E", url: "https://openai.com/dall-e" },
      { name: "FLUX-1", url: "https://flux-1.ai" },
      { name: "Ideogram", url: "https://ideogram.ai" },
      { name: "Midjourney", url: "https://midjourney.com" },
      { name: "Recraft", url: "https://recraft.ai" },
      { name: "StableDiffusion", url: "https://stablediffusionweb.com" },
    ],
  },
  {
    category: "AI Spreadsheet",
    color: "text-teal-600",
    tools: [
      { name: "Bricks", url: "https://bricks.com" },
      { name: "Formula Bot", url: "https://formulabot.com" },
      { name: "Gigasheet", url: "https://gigasheet.com" },
      { name: "Rows AI", url: "https://rows.com" },
      { name: "SheetAI", url: "https://sheetai.app" },
    ],
  },
  {
    category: "AI Meeting Notes",
    color: "text-indigo-600",
    tools: [
      { name: "Avoma", url: "https://avoma.com" },
      { name: "Equal Time", url: "https://equaltime.ai" },
      { name: "Fathom", url: "https://fathom.video" },
      { name: "Fellow.App", url: "https://fellow.app" },
      { name: "Fireflies", url: "https://fireflies.ai" },
      { name: "Harvest", url: "https://harvest.ai" },
      { name: "Otter", url: "https://otter.ai" },
    ],
  },
  {
    category: "AI Workflow Automation",
    color: "text-amber-600",
    tools: [
      { name: "Integrately", url: "https://integrately.com" },
      { name: "Make", url: "https://make.com" },
      { name: "Monday.Com", url: "https://monday.com" },
      { name: "N8n", url: "https://n8n.io" },
      { name: "Wrike", url: "https://wrike.com" },
      { name: "Zapier", url: "https://zapier.com" },
    ],
  },
  {
    category: "AI Writing",
    color: "text-pink-600",
    tools: [
      { name: "Copy.AI", url: "https://copy.ai" },
      { name: "Grammarly", url: "https://grammarly.com" },
      { name: "Jasper", url: "https://jasper.ai" },
      { name: "JoBot", url: "https://jobot.ai" },
      { name: "Quarkle", url: "https://quarkle.com" },
      { name: "Quillbot", url: "https://quillbot.com" },
      { name: "Rytr", url: "https://rytr.me" },
    ],
  },
  {
    category: "AI Video Generation",
    color: "text-cyan-600",
    tools: [
      { name: "Descript", url: "https://descript.com" },
      { name: "Haiper AI", url: "https://haiper.ai" },
      { name: "Invideo.AI", url: "https://invideo.ai" },
      { name: "Heygen", url: "https://heygen.com" },
      { name: "Kinga", url: "https://kinga.ai" },
      { name: "LTX Studio", url: "https://ltx.studio" },
      { name: "Munch", url: "https://munch.com" },
      { name: "Runway", url: "https://runwayml.com" },
    ],
  },
  {
    category: "AI Scheduling",
    color: "text-lime-600",
    tools: [
      { name: "Calendly", url: "https://calendly.com" },
      { name: "Clockwise", url: "https://clockwise.com" },
      { name: "Motion", url: "https://motion.app" },
      { name: "ReclaimAI", url: "https://reclaim.ai" },
      { name: "Skedda", url: "https://skedda.com" },
      { name: "Trevor.AI", url: "https://trevor.ai" },
    ],
  },
  {
    category: "AI Graphic Design",
    color: "text-fuchsia-600",
    tools: [
      { name: "AutoDraw", url: "https://autodraw.com" },
      { name: "Canva", url: "https://canva.com" },
      { name: "Design.Com", url: "https://design.com" },
      { name: "Figma", url: "https://figma.com" },
      { name: "Microsoft Designer", url: "https://designer.microsoft.com" },
      { name: "Pebblely", url: "https://pebblely.com" },
      { name: "Uizard", url: "https://uizard.io" },
    ],
  },
];

const codingResources = [
  {
    name: "HackerRank",
    url: "https://hackerrank.com",
    description: "Practice coding, prepare for interviews, and get hired.",
    color: "bg-green-500",
  },
  {
    name: "HackerEarth",
    url: "https://hackerearth.com",
    description: "Competitive programming challenges and hackathons.",
    color: "bg-blue-500",
  },
  {
    name: "LeetCode",
    url: "https://leetcode.com",
    description: "Best platform for technical interview preparation.",
    color: "bg-yellow-500",
  },
  {
    name: "CodeChef",
    url: "https://codechef.com",
    description: "Competitive programming contests and practice problems.",
    color: "bg-amber-700",
  },
  {
    name: "CoderByte",
    url: "https://coderbyte.com",
    description: "Coding challenges and interview prep courses.",
    color: "bg-purple-500",
  },
];

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFiles();
  }, []);

  // Track online presence
  useEffect(() => {
    if (!user || !profile) return;

    const channel = supabase.channel("online-students", {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {})
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            full_name: profile.full_name || "",
            email: profile.email || "",
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile]);

  const fetchFiles = async () => {
    const { data, error } = await supabase
      .from("files")
      .select("id, title, description, file_name, file_url, file_size, file_type, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load files");
    } else {
      setFiles(data ?? []);
    }
    setLoading(false);
  };

  const handleDownload = async (file: FileRecord) => {
    const { data, error } = await supabase.storage
      .from("study-materials")
      .download(file.file_url);

    if (error) {
      toast.error("Download failed");
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <Tabs defaultValue="materials" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="materials" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Materials
          </TabsTrigger>
          <TabsTrigger value="ai-tools" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            AI Tools
          </TabsTrigger>
          <TabsTrigger value="coding" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            Coding
          </TabsTrigger>
          <TabsTrigger value="editor" className="flex items-center gap-2">
            <Code2 className="w-4 h-4" />
            Editor
          </TabsTrigger>
        </TabsList>

        {/* Study Materials Tab */}
        <TabsContent value="materials">
          <div className="mb-6">
            <h2 className="text-2xl font-display font-bold text-foreground">Study Materials</h2>
            <p className="text-muted-foreground mt-1">Download files shared by your teachers</p>
          </div>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-5 h-40" />
                </Card>
              ))}
            </div>
          ) : files.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium">No files available yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Your teachers haven't uploaded any materials yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {files.map((file) => (
                <Card key={file.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                        {getFileIcon(file.file_type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground truncate">{file.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{file.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(file.created_at), "MMM d, yyyy")}
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        {formatBytes(file.file_size)}
                      </span>
                    </div>
                    <Button size="sm" className="w-full" onClick={() => handleDownload(file)}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* AI Productivity Tools Tab */}
        <TabsContent value="ai-tools">
          <div className="mb-6">
            <h2 className="text-2xl font-display font-bold text-foreground">AI Productivity Tools</h2>
            <p className="text-muted-foreground mt-1">Explore AI tools to boost your productivity</p>
          </div>
           <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
             {aiToolsData.map((category) => (
               <Card key={category.category} className="hover:shadow-md transition-shadow">
                 <CardHeader className="pb-3">
                   <CardTitle className={`text-sm font-bold uppercase tracking-wide ${category.color}`}>
                     {category.category}
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="pt-0">
                   <ul className="space-y-1.5">
                     {category.tools.map((tool) => (
                       <li key={tool.name} className="flex items-center gap-2 text-sm text-foreground">
                         <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                         <a href={tool.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline cursor-pointer">
                           {tool.name}
                         </a>
                       </li>
                     ))}
                   </ul>
                 </CardContent>
               </Card>
             ))}
           </div>
        </TabsContent>

        {/* Coding Resources Tab */}
        <TabsContent value="coding">
          <div className="mb-6">
            <h2 className="text-2xl font-display font-bold text-foreground">Coding Practice Platforms</h2>
            <p className="text-muted-foreground mt-1">Boost your coding skills with these platforms</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {codingResources.map((resource) => (
              <Card key={resource.name} className="hover:shadow-lg transition-shadow group">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl ${resource.color} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
                      {resource.name.charAt(0)}
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{resource.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{resource.description}</p>
                  <Button
                    variant="outline"
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    onClick={() => window.open(resource.url, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Visit {resource.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        {/* Code Editor Tab */}
        <TabsContent value="editor">
          <CodeEditor />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
