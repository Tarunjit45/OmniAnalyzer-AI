
import React, { useState, useRef, useEffect } from 'react';
import { AnalysisStatus, AnalysisResult, ChatMessage } from './types';
import { analyzeFile, createChatSession } from './services/geminiService';
import { formatBytes, fileToBase64, getSafeMimeType } from './utils/fileUtils';
import { 
  FileSearch, 
  Upload, 
  Loader2, 
  AlertCircle, 
  FileText, 
  CheckCircle2,
  ShieldCheck,
  Info,
  MessageSquare,
  Send,
  User,
  Bot,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-24 animate-in fade-in duration-700">
    <div className="relative mb-8">
      <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Bot className="w-8 h-8 text-blue-600 animate-pulse" />
      </div>
    </div>
    <h3 className="text-2xl font-bold text-slate-800 tracking-tight text-center">Reading your file carefully...</h3>
    <p className="mt-3 text-slate-500 max-w-sm text-center font-medium leading-relaxed">
      I'm looking through every corner of this file to make sure I can explain it to you simply.
    </p>
  </div>
);

const ErrorState = ({ error, onRetry }: { error: string, onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center animate-in zoom-in duration-300 max-w-lg mx-auto bg-white rounded-[2rem] border border-slate-100 shadow-xl">
    <div className="bg-red-50 p-5 rounded-full mb-6">
      <AlertCircle className="w-12 h-12 text-red-500" />
    </div>
    <h3 className="text-2xl font-bold text-slate-900 mb-3">Something went wrong</h3>
    <p className="text-slate-600 px-8 mb-8">{error}</p>
    <button 
      onClick={onRetry}
      className="px-10 py-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all font-bold shadow-xl active:scale-95"
    >
      Try another file
    </button>
  </div>
);

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatSessionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 20 * 1024 * 1024) {
      setError("This file is a bit too big for me to handle right now (limit is 20MB). Maybe try a smaller version?");
      setStatus(AnalysisStatus.ERROR);
      return;
    }

    setFile(selectedFile);
    setStatus(AnalysisStatus.LOADING);
    setError(null);
    setMessages([]);

    try {
      const base64 = await fileToBase64(selectedFile);
      const mime = getSafeMimeType(selectedFile);
      const analysis = await analyzeFile(selectedFile);
      chatSessionRef.current = createChatSession(base64, mime, selectedFile.name);
      setResult(analysis);
      setStatus(AnalysisStatus.SUCCESS);
    } catch (err: any) {
      setError("I'm having a little trouble reading this file's structure. It might be corrupted or in a format I don't fully understand yet.");
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMessage.trim() || !chatSessionRef.current || isChatting) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsChatting(true);

    try {
      const response = await chatSessionRef.current.sendMessage({ message: userText });
      setMessages(prev => [...prev, { role: 'model', text: response.text || "I'm not quite sure how to answer that based on the file. Can you ask in a different way?" }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "Oops, my brain stalled for a second! Mind asking that again?" }]);
    } finally {
      setIsChatting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setStatus(AnalysisStatus.IDLE);
    setResult(null);
    setError(null);
    setMessages([]);
    chatSessionRef.current = null;
  };

  const getVerdictStyle = (verdict: string) => {
    switch (verdict) {
      case 'SAFE': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <ShieldCheck className="w-6 h-6" />, label: 'Safe to Open' };
      case 'CAUTION': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <AlertTriangle className="w-6 h-6" />, label: 'Proceed with Caution' };
      case 'DANGER': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: <ShieldAlert className="w-6 h-6" />, label: 'Dangerous File' };
      default: return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: <Info className="w-6 h-6" />, label: 'Unknown' };
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbff] text-slate-900 selection:bg-blue-100 flex flex-col font-sans">
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-2xl border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={reset}>
            <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/30">
              <FileSearch className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900">Omni<span className="text-indigo-600">Analyze</span></span>
          </div>
          <button onClick={reset} className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">Start Over</button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12 flex-grow w-full">
        {status === AnalysisStatus.IDLE && (
          <div className="text-center mb-16 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
              Is this file <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">Safe?</span> <br /> 
              Let's find out.
            </h1>
            <p className="text-xl text-slate-500 max-w-xl mx-auto font-medium leading-relaxed">
              Upload any file and I'll explain it to you like a human. No confusing tech talk, just the truth.
            </p>

            <div className="relative group max-w-2xl mx-auto mt-12">
              <input 
                type="file" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="bg-white border-4 border-dashed border-slate-200 rounded-[3rem] p-20 flex flex-col items-center justify-center transition-all group-hover:border-indigo-400 group-hover:bg-indigo-50/20 shadow-2xl shadow-indigo-500/5">
                <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mb-8 transition-transform group-hover:scale-110 group-hover:rotate-3">
                  <Upload className="w-10 h-10 text-indigo-600" />
                </div>
                <p className="text-2xl font-extrabold text-slate-900 mb-2">Drop your file here</p>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">PDF, Word, Code, or even .EXE</p>
              </div>
            </div>
          </div>
        )}

        {status === AnalysisStatus.LOADING && <LoadingState />}
        {status === AnalysisStatus.ERROR && <ErrorState error={error!} onRetry={reset} />}

        {status === AnalysisStatus.SUCCESS && result && (
          <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700 pb-20">
            {/* Header / Verdict Card */}
            <div className={`rounded-[3rem] p-8 md:p-12 border-2 ${getVerdictStyle(result.verdict).bg} ${getVerdictStyle(result.verdict).border} shadow-2xl shadow-slate-200/50 flex flex-col md:flex-row items-center gap-10`}>
              <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center shrink-0 ${getVerdictStyle(result.verdict).bg} border-4 border-white shadow-lg`}>
                {React.cloneElement(getVerdictStyle(result.verdict).icon, { className: `w-12 h-12 ${getVerdictStyle(result.verdict).text}` })}
              </div>
              <div className="text-center md:text-left space-y-2 flex-grow">
                <span className={`text-xs font-black uppercase tracking-[0.2em] ${getVerdictStyle(result.verdict).text}`}>{getVerdictStyle(result.verdict).label}</span>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">{result.humanVerdict}</h2>
                <p className="text-lg text-slate-600 font-medium">{file?.name} ({formatBytes(file?.size || 0)})</p>
              </div>
              <button onClick={reset} className="px-8 py-4 bg-white border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all text-sm shadow-sm active:scale-95">Analyze New</button>
            </div>

            {/* Simple Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-xl shadow-slate-100/50">
                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-xl"><Info className="w-5 h-5 text-blue-600" /></div>
                  What is this?
                </h3>
                <p className="text-lg text-slate-600 leading-relaxed font-medium">
                  {result.simpleExplanation}
                </p>
              </div>

              <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-xl shadow-slate-100/50">
                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-xl"><CheckCircle2 className="w-5 h-5 text-indigo-600" /></div>
                  What should I do?
                </h3>
                <ul className="space-y-4">
                  {result.solutions.map((s, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-600 font-semibold text-lg">
                      <ArrowRight className="w-5 h-5 mt-1 text-indigo-400 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Chat Area - Integrated and Simpler */}
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden flex flex-col h-[650px]">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900">Talk with me about this file</h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Human Assistant Active</p>
                  </div>
                </div>
                <button onClick={() => setMessages([])} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-8 space-y-6 bg-slate-50/30">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-6">
                    <div className="w-20 h-20 bg-white rounded-full shadow-inner flex items-center justify-center border border-slate-100">
                      <Bot className="w-10 h-10 text-indigo-200" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-bold text-slate-800">I'm here to help.</p>
                      <p className="text-slate-500 font-medium max-w-xs">Ask me anything like "Is this a virus?" or "Explain the main text simply."</p>
                    </div>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                    <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-100 text-indigo-600'}`}>
                        {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                      </div>
                      <div className={`p-5 rounded-[1.5rem] text-lg leading-relaxed shadow-sm font-medium ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
                {isChatting && (
                  <div className="flex justify-start">
                     <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-indigo-400">
                        <Bot size={18} />
                      </div>
                      <div className="bg-white border border-slate-100 p-5 rounded-[1.5rem] rounded-tl-none shadow-sm flex gap-1">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-8 bg-white border-t border-slate-50">
                <div className="relative flex items-center gap-3">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask me anything..."
                    disabled={isChatting}
                    className="w-full bg-slate-50 border-2 border-transparent rounded-[1.5rem] pl-6 pr-16 py-5 text-lg font-bold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isChatting}
                    className="absolute right-2 p-4 bg-indigo-600 text-white rounded-[1.2rem] hover:bg-indigo-700 disabled:bg-slate-200 transition-all shadow-xl active:scale-90"
                  >
                    <Send size={22} />
                  </button>
                </div>
              </form>
            </div>

            {/* Secondary Technical Details */}
            <details className="group">
              <summary className="flex items-center justify-center gap-2 cursor-pointer py-4 text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest text-xs transition-colors">
                Show Technical Details (For Experts)
                <ChevronRight size={14} className="group-open:rotate-90 transition-transform" />
              </summary>
              <div className="mt-6 p-10 bg-slate-900 text-indigo-100 rounded-[2.5rem] font-mono text-sm leading-relaxed overflow-x-auto border border-white/5 whitespace-pre-wrap">
                {result.technicalDetails}
              </div>
            </details>
          </div>
        )}
      </main>

      <footer className="py-12 border-t border-slate-100 text-center text-slate-400 text-xs font-black uppercase tracking-widest bg-white">
        <p>OmniAnalyze &bull; Built to Protect &bull; 2024</p>
      </footer>
    </div>
  );
}

const ChevronRight = ({ className, size }: { className?: string, size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="3" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m9 18 6-6-6-6"/>
  </svg>
);
