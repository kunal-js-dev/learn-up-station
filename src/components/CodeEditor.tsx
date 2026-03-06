import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Send, Terminal, Code2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const LANGUAGES = [
  { value: "html", label: "HTML" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "ruby", label: "Ruby" },
  { value: "go", label: "Go" },
  { value: "php", label: "PHP" },
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
  ruby: 'puts "Hello World!"',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello World!")\n}',
  php: '<?php\necho "Hello World!";\n?>',
};

export default function CodeEditor() {
  const { user } = useAuth();
  const [language, setLanguage] = useState("html");
  const [code, setCode] = useState(BOILERPLATE.html);
  const [output, setOutput] = useState("");
  const [htmlOutput, setHtmlOutput] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const internalChangeRef = useRef(false);

  // Block paste from outside — allow only internal typing
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    toast.error("Pasting from outside is disabled. Please type your code.");
  }, []);

  const handleLanguageChange = (val: string) => {
    setLanguage(val);
    setCode(BOILERPLATE[val] || "");
    setOutput("");
    setHtmlOutput("");
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

  const handleCompile = async () => {
    if (!code.trim()) {
      toast.error("Please write some code first");
      return;
    }
    setIsCompiling(true);
    setOutput("");
    setHtmlOutput("");

    try {
      const { data, error } = await supabase.functions.invoke("compile-code", {
        body: { language, code },
      });

      if (error) throw error;

      if (data.isHtml) {
        setHtmlOutput(data.output);
        setOutput("");
      } else {
        setOutput(data.output + (data.stderr ? "\n" + data.stderr : ""));
        setHtmlOutput("");
      }
    } catch (err: any) {
      toast.error("Compilation failed: " + (err.message || "Unknown error"));
    } finally {
      setIsCompiling(false);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.error("Please write some code first");
      return;
    }
    if (!user) {
      toast.error("You must be logged in to submit");
      return;
    }

    setIsSubmitting(true);

    // Compile first
    try {
      const { data, error } = await supabase.functions.invoke("compile-code", {
        body: { language, code },
      });

      if (error) throw error;

      const compiledOutput = data.isHtml ? "[HTML Output]" : (data.output || "") + (data.stderr ? "\n" + data.stderr : "");

      if (data.isHtml) {
        setHtmlOutput(data.output);
      } else {
        setOutput(compiledOutput);
      }

      // Save to database
      const { error: insertError } = await supabase.from("code_submissions").insert({
        user_id: user.id,
        language,
        code,
        output: compiledOutput,
        status: "submitted",
      });

      if (insertError) throw insertError;

      toast.success("Code compiled and submitted successfully!");
    } catch (err: any) {
      toast.error("Submission failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <div className="flex gap-2 mt-3">
              <Button
                onClick={handleCompile}
                disabled={isCompiling || isSubmitting}
                className="flex-1"
                variant="outline"
              >
                {isCompiling ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Compile
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isCompiling || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Submit
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Output Panel */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Output
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
              <pre className="w-full h-80 font-mono text-sm bg-muted/50 border border-border rounded-lg p-4 overflow-auto text-foreground whitespace-pre-wrap">
                {output || "Click 'Compile' to see output here..."}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
