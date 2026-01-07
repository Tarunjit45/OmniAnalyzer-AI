
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
  ArrowRight,
  RefreshCcw
} from 'lucide-react';

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-24 animate-in fade-in zoom-in duration-500">
    <div className="relative mb-8">
      <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Bot className="w-10 h-10 text-indigo-600 animate-pulse" />
      </div>
    </div>
    <h3 className="text-2xl font-bold text-slate-800 tracking-tight text-center px-4">Analyzing every detail...</h3>
    <p className="mt-3 text-slate-500 max-w-sm text-center font-medium leading-relaxed px-6 text-sm md:text-base">
      I'm breaking down the file into simple bits so I can explain it to you clearly.
    </p>
  </div>
);

const ErrorState = ({ error, onRetry }: { error: string, onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center animate-in slide-in-from-top-4 duration-300 max-w-lg mx-auto bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl px-8">
    <div className="bg-red-50 p-6 rounded-full mb-6">
      <AlertCircle className="w-12 h-12 text-red-500" />
    </div>
    <h3 className="text-2xl font-bold text-slate-900 mb-3">Something didn't work</h3>
    <p className="text-slate-600 mb-8 text-sm md:text-base leading-relaxed">{error}</p>
    <button 
      onClick={onRetry}
      className="w-full flex items-center justify-center gap-2 px-10 py-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all font-bold shadow-xl active:scale-95"
    >
      <RefreshCcw size={18} />
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
      setError("This file is a bit too big for me to handle (limit is 20MB). Maybe try a smaller version?");
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
      setError("I'm having a little trouble reading this file. It might be complex, password-protected, or in a format I'm still learning.");
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
      setMessages(prev => [...prev, { role: 'model', text: response.text || "I processed that, but I don't have a clear answer. Try asking differently!" }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "My connection flickered! Could you ask that again?" }]);
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
      default: return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: <Info className="w-6 h-6" />, label: 'Analysis Complete' };
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbff] text-slate-900 selection:bg-indigo-100 flex flex-col font-sans overflow-x-hidden">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3 cursor-pointer group" onClick={reset}>
            <div className="bg-indigo-600 p-2 md:p-2.5 rounded-xl md:rounded-2xl shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
              <FileSearch className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <span className="text-xl md:text-2xl font-black tracking-tight text-slate-900">Omni<span className="text-indigo-600">Analyze</span></span>
          </div>
          <button onClick={reset} className="text-xs md:text-sm font-bold px-4 py-2 bg-slate-50 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all">Start Over</button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 flex-grow w-full">
        {status === AnalysisStatus.IDLE && (
          <div className="text-center mb-12 space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight px-2">
              Upload any file. <br /> 
              I'll explain it <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">simply.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-500 max-w-xl mx-auto font-medium leading-relaxed px-4">
              From confusing code to strange documents, I'll tell you what they really are and if they're safe.
            </p>

            <div className="relative group max-w-2xl mx-auto mt-8 md:mt-12">
              <input 
                type="file" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                aria-label="Upload file for analysis"
              />
              <div className="bg-white border-3 md:border-4 border-dashed border-slate-200 rounded-[2.5rem] md:rounded-[3.5rem] p-12 md:p-24 flex flex-col items-center justify-center transition-all group-hover:border-indigo-400 group-hover:bg-indigo-50/10 shadow-xl shadow-slate-200/40">
                <div className="w-16 h-16 md:w-24 md:h-24 bg-indigo-50 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center mb-6 md:mb-8 transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-inner">
                  <Upload className="w-8 h-8 md:w-10 md:h-10 text-indigo-600" />
                </div>
                <p className="text-xl md:text-3xl font-extrabold text-slate-900 mb-2">Initialize Analysis</p>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] md:text-xs">Drag & drop or tap to browse</p>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 mt-12 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span className="bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">PDFs</span>
              <span className="bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">HTML / JS</span>
              <span className="bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">EXE / Binaries</span>
              <span className="bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">Documents</span>
            </div>
          </div>
        )}

        {status === AnalysisStatus.LOADING && <LoadingState />}
        {status === AnalysisStatus.ERROR && <ErrorState error={error!} onRetry={reset} />}

        {status === AnalysisStatus.SUCCESS && result && (
          <div className="space-y-8 md:space-y-12 animate-in fade-in zoom-in-95 duration-500 pb-20">
            {/* Header / Verdict Card */}
            <div className={`rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-14 border-2 ${getVerdictStyle(result.verdict).bg} ${getVerdictStyle(result.verdict).border} shadow-2xl shadow-slate-200/40 flex flex-col md:flex-row items-center gap-8 md:gap-12 transition-all`}>
              <div className={`w-20 h-20 md:w-28 md:h-28 rounded-3xl md:rounded-[2.5rem] flex items-center justify-center shrink-0 ${getVerdictStyle(result.verdict).bg} border-4 border-white shadow-xl`}>
                {React.cloneElement(getVerdictStyle(result.verdict).icon, { className: `w-10 h-10 md:w-14 md:h-14 ${getVerdictStyle(result.verdict).text}` })}
              </div>
              <div className="text-center md:text-left space-y-3 flex-grow">
                <span className={`text-[10px] md:text-xs font-black uppercase tracking-[0.2em] px-3 py-1 bg-white/50 rounded-full ${getVerdictStyle(result.verdict).text}`}>{getVerdictStyle(result.verdict).label}</span>
                <h2 className="text-2xl md:text-4xl font-black text-slate-900 leading-tight">{result.humanVerdict}</h2>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm md:text-base text-slate-600 font-bold">
                  <span className="flex items-center gap-1.5"><FileText size={16} className="text-slate-400" /> {file?.name}</span>
                  <span className="text-slate-300">|</span>
                  <span>{formatBytes(file?.size || 0)}</span>
                </div>
              </div>
            </div>

            {/* Simple Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
              <div className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-100 shadow-xl shadow-slate-200/20 group hover:border-indigo-100 transition-colors">
                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 rounded-2xl group-hover:scale-110 transition-transform"><Info className="w-6 h-6 text-blue-600" /></div>
                  The Big Picture
                </h3>
                <p className="text-base md:text-xl text-slate-600 leading-relaxed font-medium">
                  {result.simpleExplanation}
                </p>
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-100 shadow-xl shadow-slate-200/20 group hover:border-indigo-100 transition-colors">
                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 rounded-2xl group-hover:scale-110 transition-transform"><CheckCircle2 className="w-6 h-6 text-indigo-600" /></div>
                  Recommended Steps
                </h3>
                <ul className="space-y-4 md:space-y-6">
                  {result.solutions.map((s, i) => (
                    <li key={i} className="flex items-start gap-4 text-slate-700 font-bold text-base md:text-lg">
                      <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                      </div>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* AI Assistant Chat */}
            <div className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col h-[600px] md:h-[750px]">
              <div className="p-6 md:p-10 border-b border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-base md:text-lg">Ask me anything</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">Active Insight Mode</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setMessages([])} 
                  className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                  title="Clear conversation"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-4 md:p-10 space-y-6 md:space-y-8 bg-slate-50/20 custom-scrollbar">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 md:p-12 space-y-6 animate-in fade-in duration-1000">
                    <div className="w-24 h-24 bg-white rounded-[2rem] shadow-inner flex items-center justify-center border border-slate-100">
                      <Bot className="w-12 h-12 text-indigo-100" />
                    </div>
                    <div className="space-y-3">
                      <p className="text-xl md:text-2xl font-black text-slate-800">Ready to chat.</p>
                      <p className="text-sm md:text-lg text-slate-500 font-medium max-w-sm">
                        I've read the file. Try asking: <br />
                        <span className="italic">"Is this safe to run?"</span> or <br />
                        <span className="italic">"Summarize this for a kid."</span>
                      </p>
                    </div>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`flex gap-3 md:gap-5 max-w-[92%] md:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-md ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-100 text-indigo-600'}`}>
                        {msg.role === 'user' ? <User size={18} md:size={22} /> : <Bot size={18} md:size={22} />}
                      </div>
                      <div className={`p-5 md:p-7 rounded-[1.5rem] md:rounded-[2rem] text-sm md:text-lg leading-relaxed shadow-sm font-medium ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none shadow-indigo-200/50' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
                {isChatting && (
                  <div className="flex justify-start">
                     <div className="flex gap-4 md:gap-5">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-indigo-400 shadow-sm">
                        <Bot size={18} md:size={22} />
                      </div>
                      <div className="bg-white border border-slate-100 p-5 md:p-7 rounded-[1.5rem] md:rounded-[2rem] rounded-tl-none shadow-sm flex gap-1.5 items-center">
                        <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-indigo-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-6 md:p-10 bg-white border-t border-slate-50">
                <div className="relative flex items-center gap-4">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type your question..."
                    disabled={isChatting}
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl md:rounded-[2.2rem] pl-6 md:pl-8 pr-14 md:pr-20 py-4 md:py-6 text-sm md:text-xl font-bold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all disabled:opacity-50 shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isChatting}
                    className="absolute right-2 md:right-3 p-3.5 md:p-5 bg-indigo-600 text-white rounded-xl md:rounded-[1.8rem] hover:bg-indigo-700 disabled:bg-slate-200 transition-all shadow-xl shadow-indigo-500/30 active:scale-90"
                    aria-label="Send message"
                  >
                    <Send size={20} md:size={24} />
                  </button>
                </div>
              </form>
            </div>

            {/* Deep Technical Access */}
            <details className="group">
              <summary className="flex items-center justify-center gap-2 cursor-pointer py-6 text-slate-400 hover:text-indigo-600 font-black uppercase tracking-[0.2em] text-[10px] md:text-xs transition-all">
                Access Deep Technical Metadata
                <ChevronRight size={14} className="group-open:rotate-90 transition-transform" />
              </summary>
              <div className="mt-4 p-8 md:p-12 bg-slate-900 text-indigo-100 rounded-[2.5rem] font-mono text-[10px] md:text-sm leading-relaxed overflow-x-auto border border-white/5 whitespace-pre-wrap shadow-2xl">
                <div className="flex items-center gap-2 mb-6 text-indigo-400 border-b border-indigo-400/20 pb-4">
                  <Bot size={16} /> <span>RAW DATA_STREAM ENGINE_v3.0</span>
                </div>
                {result.technicalDetails}
              </div>
            </details>
          </div>
        )}
      </main>

      <footer className="py-12 md:py-16 border-t border-slate-100 text-center bg-white">
        <div className="max-w-5xl mx-auto px-6 flex flex-col items-center gap-4">
           <div className="bg-slate-50 px-6 py-2 rounded-full border border-slate-100">
             <p className="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-widest">
               OmniAnalyze • Built to Protect • 2024
             </p>
           </div>
           <p className="text-indigo-600 font-black text-xs md:text-sm uppercase tracking-tighter">
             Designed and Developed by <span className="text-slate-900">Senior Engineer</span>
           </p>
           <div className="flex gap-4 mt-2">
             <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
             <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
             <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
           </div>
        </div>
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
    strokeWidth="4" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m9 18 6-6-6-6"/>
  </svg>
);
