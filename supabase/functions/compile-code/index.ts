import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Piston API language mapping with real compilers/interpreters
const languageMap: Record<string, { language: string; version: string; compiled: boolean }> = {
  // Compiled languages
  c:          { language: "c",          version: "10.2.0",  compiled: true },
  cpp:        { language: "c++",        version: "10.2.0",  compiled: true },
  csharp:     { language: "csharp",     version: "6.12.0",  compiled: true },
  java:       { language: "java",       version: "15.0.2",  compiled: true },
  kotlin:     { language: "kotlin",     version: "1.8.20",  compiled: true },
  rust:       { language: "rust",       version: "1.68.2",  compiled: true },
  go:         { language: "go",         version: "1.16.2",  compiled: true },
  swift:      { language: "swift",      version: "5.3.3",   compiled: true },
  scala:      { language: "scala",      version: "3.2.2",   compiled: true },
  typescript: { language: "typescript", version: "5.0.3",   compiled: true },
  // Interpreted languages
  javascript: { language: "javascript", version: "18.15.0", compiled: false },
  python:     { language: "python",     version: "3.10.0",  compiled: false },
  ruby:       { language: "ruby",       version: "3.0.1",   compiled: false },
  php:        { language: "php",        version: "8.2.3",   compiled: false },
  perl:       { language: "perl",       version: "5.36.0",  compiled: false },
  r:          { language: "r",          version: "4.1.1",   compiled: false },
  lua:        { language: "lua",        version: "5.4.4",   compiled: false },
  bash:       { language: "bash",       version: "5.2.0",   compiled: false },
  dart:       { language: "dart",       version: "2.19.6",  compiled: false },
  // Markup
  html:       { language: "html",       version: "5",       compiled: false },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { language, code } = await req.json();

    if (!language || !code) {
      return new Response(
        JSON.stringify({ error: "Language and code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // HTML: return as-is for iframe rendering
    if (language === "html") {
      return new Response(
        JSON.stringify({ output: code, isHtml: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const langConfig = languageMap[language];
    if (!langConfig) {
      return new Response(
        JSON.stringify({ error: `Unsupported language: ${language}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://emkc.org/api/v2/piston/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: langConfig.language,
        version: langConfig.version,
        files: [{ content: code }],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Piston API error (${response.status}): ${text}`);
    }

    const result = await response.json();

    // Separate compile and run output for compiled languages
    const compileOutput = result.compile?.output || "";
    const compileStderr = result.compile?.stderr || "";
    const compileCode = result.compile?.code ?? null;

    const runOutput = result.run?.output || "";
    const runStderr = result.run?.stderr || "";
    const runCode = result.run?.code ?? 0;

    // If compilation failed, return compile errors
    if (langConfig.compiled && compileCode !== null && compileCode !== 0) {
      return new Response(
        JSON.stringify({
          output: "",
          stderr: compileStderr || compileOutput,
          compileError: true,
          isHtml: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const output = runOutput || compileOutput || "No output";
    const stderr = runStderr || compileStderr || "";

    return new Response(
      JSON.stringify({
        output,
        stderr,
        exitCode: runCode,
        compileError: false,
        isHtml: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
