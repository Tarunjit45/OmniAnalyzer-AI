import React, { useState, useRef, useEffect } from 'react';
import { AnalysisStatus, AnalysisResult, ChatMessage } from './types';
import { analyzeFile, createChatSession } from './services/geminiService';
import { formatBytes, fileToBase64, getSafeMimeType } from './utils/fileUtils';
import { 
  FileSearch, 
  Upload, 
  AlertCircle, 
  FileText, 
  CheckCircle2,
  ShieldCheck,
  Info,
  MessageSquare,
  Send,
  User,
  Bot,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  RefreshCcw,
  KeyRound
} from 'lucide-react';

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-24 animate-in fade-in zoom-in duration-500">
    <div className="relative mb-8">
      <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Bot size={40} className="text-indigo-600 animate-pulse" />
      </div>
    </div>
    <h3 className="text-2xl font-bold text-slate-800 tracking-tight text-center px-4">Analyzing every detail...</h3>
    <p className="mt-3 text-slate-500 max-w-sm text-center font-medium leading-relaxed px-6 text-sm md:text-base">
      I&apos;m breaking down the file into simple bits so I can explain it to you clearly.
    </p>
  </div>
);

const ErrorState = ({ error, onRetry }: { error: string, onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center animate-in slide-in-from-top-4 duration-300 max-w-lg mx-auto bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl px-8">
    <div className="bg-red-50 p-6 rounded-full mb-6">
      <AlertCircle size={48} className="text-red-500" />
    </div>
    <h3 className="text-2xl font-bold text-slate-900 mb-3">Something didn&apos;t work</h3>
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
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatSessionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check multiple possible locations for the API key in the browser context
    const env = (window as any).process?.env || {};
    const key = env.API_KEY || env.NEXT_PUBLIC_API_KEY || env.VITE_API_KEY;
    
    if (!key || key === 'undefined' || key === '') {
      setApiKeyMissing(true);
    } else {
      setApiKeyMissing(false);
    }
  }, []);

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
      console.error(err);
      setError("I'm having a little trouble reading this file. Please make sure your API key is correct and valid.");
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
      setMessages(prev => [...prev, { role: 'model', text: response.text || "I processed that, but I don't have a clear answer." }]);
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
      case 'SAFE': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <ShieldCheck size={40} />, label: 'Safe to Open' };
      case 'CAUTION': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <AlertTriangle size={40} />, label: 'Proceed with Caution' };
      case 'DANGER': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: <ShieldAlert size={40} />, label: 'Dangerous File' };
      default: return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: <Info size={40} />, label: 'Analysis Complete' };
    }
  };

  if (apiKeyMissing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-[2.5rem] p-12 max-w-lg w-full text-center shadow-2xl border border-slate-100">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <KeyRound size={40} className="text-amber-500" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-4">API Key Required</h1>
          <p className="text-slate-600 mb-8 leading-relaxed font-medium">
            To use OmniAnalyze, you need to set your <span className="text-indigo-600 font-bold">API_KEY</span> in your Vercel Environment Variables.
          </p>
          <div className="p-4 bg-slate-50 rounded-2xl text-xs font-mono text-slate-400 text-left border border-slate-100">
            Vercel Dashboard &gt; Settings &gt; Environment Variables &gt; Add API_KEY
          </div>
          <p className="mt-6 text-xs text-slate-400 font-medium">
            Crucial: You must <span className="text-indigo-600 font-bold">Redeploy</span> the project after adding the key for it to take effect.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-8 flex items-center justify-center gap-2 mx-auto px-8 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-bold active:scale-95"
          >
            <RefreshCcw size={16} />
            Refresh App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafbff] text-slate-900 flex flex-col font-sans overflow-x-hidden">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3 cursor-pointer group" onClick={reset}>
            <div className="bg-indigo-600 p-2 md:p-2.5 rounded-xl md:rounded-2xl shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
              <FileSearch size={24} className="text-white" />
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
              I&apos;ll explain it <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">simply.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-500 max-w-xl mx-auto font-medium leading-relaxed px-4">
              From confusing code to strange documents, I&apos;ll tell you what they really are and if they&apos;re safe.
            </p>

            <div className="relative group max-w-2xl mx-auto mt-8 md:mt-12">
              <input 
                type="file" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                aria-label="Upload file for analysis"
              />
              <div className="bg-white border-4 border-dashed border-slate-200 rounded-[2.5rem] md:rounded-[3.5rem] p-12 md:p-24 flex flex-col items-center justify-center transition-all group-hover:border-indigo-400 group-hover:bg-indigo-50/10 shadow-xl shadow-slate-200/40">
                <div className="w-16 h-16 md:w-24 md:h-24 bg-indigo-50 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center mb-6 md:mb-8 transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-inner">
                  <Upload size={40} className="text-indigo-600" />
                </div>
                <p className="text-xl md:text-3xl font-extrabold text-slate-900 mb-2">Initialize Analysis</p>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] md:text-xs">Drag & drop or tap to browse</p>
              </div>
            </div>
          </div>
        )}

        {status === AnalysisStatus.LOADING && <LoadingState />}
        {status === AnalysisStatus.ERROR && <ErrorState error={error!} onRetry={reset} />}

        {status === AnalysisStatus.SUCCESS && result && (
          <div className="space-y-8 md:space-y-12 animate-in fade-in zoom-in-95 duration-500 pb-20">
            <div className={`rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-14 border-2 ${getVerdictStyle(result.verdict).bg} ${getVerdictStyle(result.verdict).border} shadow-2xl flex flex-col md:flex-row items-center gap-8 md:gap-12`}>
              <div className={`w-20 h-20 md:w-28 md:h-28 rounded-3xl md:rounded-[2.5rem] flex items-center justify-center shrink-0 ${getVerdictStyle(result.verdict).bg} border-4 border-white shadow-xl`}>
                {React.cloneElement(getVerdictStyle(result.verdict).icon as React.ReactElement<any>, { className: getVerdictStyle(result.verdict).text })}
              </div>
              <div className="text-center md:text-left space-y-3 flex-grow">
                <span className={`text-[10px] md:text-xs font-black uppercase tracking-[0.2em] px-3 py-1 bg-white/50 rounded-full ${getVerdictStyle(result.verdict).text}`}>{getVerdictStyle(result.verdict).label}</span>
                <h2 className="text-2xl md:text-4xl font-black text-slate-900 leading-tight">{result.humanVerdict}</h2>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm md:text-base text-slate-600 font-bold">
                  <span className="flex items-center gap-1.5"><FileText size={16} /> {file?.name}</span>
                  <span className="text-slate-300">|</span>
                  <span>{formatBytes(file?.size || 0)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
              <div className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-100 shadow-xl group hover:border-indigo-100 transition-colors">
                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 rounded-2xl group-hover:scale-110 transition-transform"><Info size={24} className="text-blue-600" /></div>
                  The Big Picture
                </h3>
                <p className="text-base md:text-xl text-slate-600 leading-relaxed font-medium">{result.simpleExplanation}</p>
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-100 shadow-xl group hover:border-indigo-100 transition-colors">
                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 rounded-2xl group-hover:scale-110 transition-transform"><CheckCircle2 size={24} className="text-indigo-600" /></div>
                  Recommended Steps
                </h3>
                <ul className="space-y-4 md:space-y-6">
                  {result.solutions.map((s, i) => (
                    <li key={i} className="flex items-start gap-4 text-slate-700 font-bold text-base md:text-lg">
                      <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        <ArrowRight size={14} className="text-indigo-600" />
                      </div>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden flex flex-col h-[600px] md:h-[750px]">
              <div className="p-6 md:p-10 border-b border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <MessageSquare size={24} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-base md:text-lg">Ask me anything</h4>
                    <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">Active Insight Mode</p>
                  </div>
                </div>
              </div>

              <div className="flex-grow overflow-y-auto p-4 md:p-10 space-y-6 md:space-y-8 bg-slate-50/20">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
                    <Bot size={48} className="text-indigo-100" />
                    <p className="text-xl font-black text-slate-800">Ready to chat.</p>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-3 max-w-[92%] md:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-md ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white border text-indigo-600'}`}>
                        {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                      </div>
                      <div className={`p-5 rounded-[1.5rem] text-sm md:text-lg font-medium shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
                {isChatting && <div className="flex justify-start items-center gap-2 p-4 text-slate-400 font-bold italic animate-pulse">
                  <Bot size={18} /> 
                  Thinking...
                </div>}
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
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl md:rounded-[2.2rem] pl-6 md:pl-8 pr-14 md:pr-20 py-4 md:py-6 text-sm md:text-xl font-bold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isChatting}
                    className="absolute right-2 md:right-3 p-3.5 md:p-5 bg-indigo-600 text-white rounded-xl md:rounded-[1.8rem] hover:bg-indigo-700 disabled:bg-slate-200 transition-all active:scale-90"
                  >
                    <Send size={22} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <footer className="py-12 border-t border-slate-100 text-center bg-white">
        <div className="max-w-5xl mx-auto px-6 flex flex-col items-center gap-4">
           <div className="bg-slate-50 px-6 py-2 rounded-full border border-slate-100">
             <p className="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-widest">
               OmniAnalyze • Built to Protect • 2024
             </p>
           </div>
           <p className="text-indigo-600 font-black text-xs md:text-sm uppercase tracking-tighter">
             Designed and Developed with Gemini AI
           </p>
        </div>
      </footer>
    </div>
  );
}
