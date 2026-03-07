import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Send, Terminal, Code2, Loader2, AlertTriangle, ExternalLink, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

const LANGUAGES = [
  { value: "html", label: "HTML", category: "Markup" },
  { value: "javascript", label: "JavaScript", category: "Interpreted" },
  { value: "typescript", label: "TypeScript", category: "Compiled" },
  { value: "python", label: "Python", category: "Interpreted" },
  { value: "java", label: "Java", category: "Compiled" },
  { value: "c", label: "C", category: "Compiled" },
  { value: "cpp", label: "C++", category: "Compiled" },
  { value: "csharp", label: "C#", category: "Compiled" },
  { value: "go", label: "Go", category: "Compiled" },
  { value: "rust", label: "Rust", category: "Compiled" },
  { value: "kotlin", label: "Kotlin", category: "Compiled" },
  { value: "swift", label: "Swift", category: "Compiled" },
  { value: "scala", label: "Scala", category: "Compiled" },
  { value: "dart", label: "Dart", category: "Interpreted" },
  { value: "ruby", label: "Ruby", category: "Interpreted" },
  { value: "php", label: "PHP", category: "Interpreted" },
  { value: "perl", label: "Perl", category: "Interpreted" },
  { value: "lua", label: "Lua", category: "Interpreted" },
  { value: "r", label: "R", category: "Interpreted" },
  { value: "bash", label: "Bash", category: "Interpreted" },
];

const BOILERPLATE: Record<string, string> = {
  html: '<!DOCTYPE html>\n<html>\n<head>\n  <title>My Page</title>\n</head>\n<body>\n  <h1>Hello World!</h1>\n</body>\n</html>',
  javascript: 'console.log("Hello World!");',
  typescript: 'const greeting: string = "Hello World!";\nconsole.log(greeting);',
  python: 'print("Hello World!")',
  java: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello World!");\n  }\n}',
  c: '#include <stdio.h>\n\nint main() {\n  printf("Hello World!\\n");\n  return 0;\n}',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Hello World!" << endl;\n  return 0;\n}',
  csharp: 'using System;\n\nclass Program {\n  static void Main() {\n    Console.WriteLine("Hello World!");\n  }\n}',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello World!")\n}',
  rust: 'fn main() {\n  println!("Hello World!");\n}',
  kotlin: 'fun main() {\n  println("Hello World!")\n}',
  swift: 'print("Hello World!")',
  scala: 'object Main extends App {\n  println("Hello World!")\n}',
  dart: 'void main() {\n  print("Hello World!");\n}',
  ruby: 'puts "Hello World!"',
  php: '<?php\necho "Hello World!";\n?>',
  perl: 'print "Hello World!\\n";',
  lua: 'print("Hello World!")',
  r: 'cat("Hello World!\\n")',
  bash: 'echo "Hello World!"',
};

// Programiz online compiler URLs by language
const PROGRAMIZ_URLS: Record<string, string> = {
  python: "https://www.programiz.com/python-programming/online-compiler/",
  java: "https://www.programiz.com/java-programming/online-compiler/",
  c: "https://www.programiz.com/c-programming/online-compiler/",
  cpp: "https://www.programiz.com/cpp-programming/online-compiler/",
  csharp: "https://www.programiz.com/csharp-programming/online-compiler/",
  javascript: "https://www.programiz.com/javascript/online-compiler/",
  r: "https://www.programiz.com/r/online-compiler/",
  go: "https://www.programiz.com/golang/online-compiler/",
  kotlin: "https://www.programiz.com/kotlin-programming/online-compiler/",
  swift: "https://www.programiz.com/swift/online-compiler/",
  rust: "https://www.programiz.com/rust/online-compiler/",
  dart: "https://www.programiz.com/dart/online-compiler/",
  ruby: "https://www.programiz.com/ruby/online-compiler/",
  php: "https://www.programiz.com/php/online-compiler/",
  scala: "https://www.programiz.com/scala/online-compiler/",
  typescript: "https://www.programiz.com/typescript/online-compiler/",
  bash: "https://www.programiz.com/bash/online-compiler/",
  lua: "https://www.programiz.com/lua/online-compiler/",
  perl: "https://www.programiz.com/perl/online-compiler/",
  html: "https://www.programiz.com/html/online-compiler/",
};

export default function CodeEditor() {
  const { user } = useAuth();
  const [language, setLanguage] = useState("html");
  const [code, setCode] = useState(BOILERPLATE.html);
  const [output, setOutput] = useState("");
  const [stderr, setStderr] = useState("");
  const [isCompileError, setIsCompileError] = useState(false);
  const [htmlOutput, setHtmlOutput] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    toast.error("Pasting from outside is disabled. Please type your code.");
  }, []);

  const handleLanguageChange = (val: string) => {
    setLanguage(val);
    setCode(BOILERPLATE[val] || "");
    setOutput("");
    setStderr("");
    setHtmlOutput("");
    setIsCompileError(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = code.substring(0, start) + "  " + code.substring(end);
      setCode(newCode);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("Please select image files only");
      return;
    }
    const newImages = [...uploadedImages, ...imageFiles].slice(0, 5);
    setUploadedImages(newImages);
    const previews = newImages.map((f) => URL.createObjectURL(f));
    setImagePreviews(previews);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (!user || uploadedImages.length === 0) return [];
    const urls: string[] = [];
    for (const file of uploadedImages) {
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("submission-images")
        .upload(filePath, file);
      if (error) throw new Error(`Image upload failed: ${error.message}`);
      urls.push(filePath);
    }
    return urls;
  };

  const processResult = (data: any) => {
    if (data.isHtml) {
      setHtmlOutput(data.output);
      setOutput("");
      setStderr("");
      setIsCompileError(false);
    } else {
      setHtmlOutput("");
      setOutput(data.output || "");
      setStderr(data.stderr || "");
      setIsCompileError(!!data.compileError);
    }
  };

  const handleCompile = async () => {
    if (!code.trim()) { toast.error("Please write some code first"); return; }
    setIsCompiling(true);
    setOutput(""); setStderr(""); setHtmlOutput(""); setIsCompileError(false);
    try {
      const { data, error } = await supabase.functions.invoke("compile-code", {
        body: { language, code },
      });
      if (error) throw error;
      processResult(data);
    } catch (err: any) {
      toast.error("Compilation failed: " + (err.message || "Unknown error"));
    } finally {
      setIsCompiling(false);
    }
  };

  const handleOpenProgramiz = () => {
    const url = PROGRAMIZ_URLS[language];
    if (url) {
      window.open(url, "_blank");
    } else {
      toast.error("Programiz doesn't support this language");
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) { toast.error("Please write some code first"); return; }
    if (!user) { toast.error("You must be logged in to submit"); return; }
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("compile-code", {
        body: { language, code },
      });
      if (error) throw error;
      processResult(data);

      const compiledOutput = data.isHtml
        ? "[HTML Output]"
        : (data.output || "") + (data.stderr ? "\n" + data.stderr : "");

      // Upload images if any
      const imageUrls = await uploadImages();

      const { error: insertError } = await supabase.from("code_submissions").insert({
        user_id: user.id,
        language,
        code,
        output: compiledOutput,
        status: "submitted",
        image_url: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
      });
      if (insertError) throw insertError;
      toast.success("Code compiled and submitted successfully!");
      // Clear images after successful submit
      imagePreviews.forEach((p) => URL.revokeObjectURL(p));
      setUploadedImages([]);
      setImagePreviews([]);
    } catch (err: any) {
      toast.error("Submission failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentLang = LANGUAGES.find((l) => l.value === language);

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold text-foreground">Code Editor</h2>
        <p className="text-muted-foreground mt-1">Write, compile, and submit your code</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Editor Panel */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Code2 className="w-4 h-4" />
                Editor
                {currentLang && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {currentLang.category}
                  </span>
                )}
              </CardTitle>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="flex-1 pt-0">
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="w-full h-80 font-mono text-sm bg-muted/50 border border-border rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground placeholder:text-muted-foreground"
              placeholder="Start typing your code here..."
            />

            {/* Image Upload Area */}
            <div className="mt-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-muted-foreground"
                >
                  <ImagePlus className="w-4 h-4 mr-1" />
                  Attach Images ({uploadedImages.length}/5)
                </Button>
                {imagePreviews.map((src, i) => (
                  <div key={i} className="relative w-10 h-10 rounded border border-border overflow-hidden group">
                    <img src={src} alt={`upload-${i}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <Button onClick={handleCompile} disabled={isCompiling || isSubmitting} className="flex-1" variant="outline">
                {isCompiling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Compile
              </Button>
              <Button onClick={handleOpenProgramiz} variant="outline" className="shrink-0" title="Open in Programiz">
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button onClick={handleSubmit} disabled={isCompiling || isSubmitting} className="flex-1">
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Submit
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Output Panel */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {isCompileError ? (
                <AlertTriangle className="w-4 h-4 text-destructive" />
              ) : (
                <Terminal className="w-4 h-4" />
              )}
              {isCompileError ? "Compilation Error" : "Output"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pt-0">
            {htmlOutput ? (
              <iframe
                srcDoc={htmlOutput}
                className="w-full h-80 border border-border rounded-lg bg-white"
                sandbox="allow-scripts"
                title="HTML Output"
              />
            ) : (
              <div className="w-full h-80 font-mono text-sm bg-muted/50 border border-border rounded-lg p-4 overflow-auto">
                {isCompileError && stderr ? (
                  <pre className="text-destructive whitespace-pre-wrap">{stderr}</pre>
                ) : (
                  <>
                    <pre className="text-foreground whitespace-pre-wrap">
                      {output || "Click 'Compile' to see output here..."}
                    </pre>
                    {stderr && (
                      <pre className="text-destructive whitespace-pre-wrap mt-2 pt-2 border-t border-border">
                        {stderr}
                      </pre>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
