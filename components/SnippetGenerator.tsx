'use client';

import React, { useState } from 'react';
import { Code2, Copy, CheckCircle2, Terminal } from 'lucide-react';

export default function SnippetGenerator({ agentId }: { agentId: string }) {
  const [copied, setCopied] = useState(false);

  const appHost = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.com';

  const embedCode = `<!-- AI Sales Agent Widget -->
<script
  src="${appHost}/widget.js"
  data-agent-id="${agentId}"
  data-host="${appHost}"
  async>
</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span>HTML Embed Code</span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition"
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>

      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 font-mono text-xs text-indigo-300 overflow-x-auto leading-relaxed">
        <pre>{embedCode}</pre>
      </div>

      <p className="text-xs text-slate-400 leading-normal">
        Paste this script directly into the <code>&lt;head&gt;</code> or bottom of the <code>&lt;body&gt;</code> tag of your website.
      </p>
    </div>
  );
}
