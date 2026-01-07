import React, { useState, useRef, useEffect } from 'react';
import { AnalysisStatus, AnalysisResult, ChatMessage } from './types';
import { analyzeFile, createChatSession } from './services/geminiService';
import { analyzeFileHardcoded } from './services/analyzer';
import { formatBytes, fileToBase64, getSafeMimeType } from './utils/fileUtils';
import { 
  FileSearch, Upload, AlertCircle, FileText, CheckCircle2,
  ShieldCheck, Info, MessageSquare, Send, User, Bot,
  AlertTriangle, ShieldAlert, ArrowRight, RefreshCcw, KeyRound,
  Settings, Zap, Shield, Sparkles, Linkedin, Mail
} from 'lucide-react';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // API Key Management - Default to empty unless explicitly provided
  const [userApiKey, setUserApiKey] = useState<string>(localStorage.getItem('omni_api_key') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [isProMode, setIsProMode] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatSessionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if any key exists (Local Storage or Vercel Environment)
    const envKey = (window as any).process?.env?.API_KEY;
    if ((envKey && envKey !== 'undefined' && envKey !== '') || (userApiKey && userApiKey.trim() !== '')) {
      setIsProMode(true);
    } else {
      setIsProMode(false);
    }
  }, [userApiKey]);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('omni_api_key', userApiKey.trim());
    setShowSettings(false);
    const hasKeyNow = userApiKey.trim() !== '';
    setIsProMode(hasKeyNow);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setStatus(AnalysisStatus.LOADING);
    setError(null);
    setMessages([]);

    try {
      if (isProMode) {
        try {
          const analysis = await analyzeFile(selectedFile);
          const base64 = await fileToBase64(selectedFile);
          const mime = getSafeMimeType(selectedFile);
          chatSessionRef.current = createChatSession(base64, mime, selectedFile.name);
          setResult(analysis);
        } catch (aiErr) {
          console.warn("AI Analysis failed, falling back to signature analysis:", aiErr);
          const fallback = await analyzeFileHardcoded(selectedFile);
          setResult(fallback);
        }
      } else {
        const analysis = await analyzeFileHardcoded(selectedFile);
        setResult(analysis);
      }
      setStatus(AnalysisStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setError("Something went wrong during analysis. Please try again.");
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
      setMessages(prev => [...prev, { role: 'model', text: response.text || "I've analyzed that, but I have no specific commentary." }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "The AI session expired or the API key is invalid. Please check your settings." }]);
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
      case 'SAFE': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <ShieldCheck size={40} />, label: 'Safe' };
      case 'CAUTION': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <AlertTriangle size={40} />, label: 'Caution' };
      case 'DANGER': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: <ShieldAlert size={40} />, label: 'Danger' };
      default: return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: <Info size={40} />, label: 'Analyzed' };
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-900 flex flex-col font-sans">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4">
        <div className="max-w-6xl mx-auto h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={reset}>
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
              <FileSearch size={24} className="text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900">Omni<span className="text-indigo-600">Analyze</span></span>
          </div>
          <div className="flex items-center gap-4">
            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black tracking-widest transition-all ${isProMode ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
              {isProMode ? <Sparkles size={12} fill="white" /> : <Shield size={12} />}
              {isProMode ? 'PRO AI ACTIVE' : 'FREE SIGNATURE MODE'}
            </div>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2.5 hover:bg-slate-100 rounded-2xl transition-all active:scale-90 border border-slate-100"
              title="Settings & API Key"
            >
              <Settings size={20} className="text-slate-500" />
            </button>
          </div>
        </div>
      </nav>

      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-xl"><Zap className="text-indigo-600" size={20} /></div>
                <h2 className="text-xl font-black text-slate-900">AI Configuration</h2>
              </div>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 p-2">✕</button>
            </div>
            <p className="text-sm text-slate-500 mb-8 font-medium leading-relaxed">
              OmniAnalyze works for <span className="text-slate-900 font-bold">free</span> using local signatures. For deep content analysis and AI chat, please provide your own Gemini API Key.
            </p>
            <form onSubmit={handleSaveKey} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Your Google Gemini Key</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password"
                    value={userApiKey}
                    onChange={(e) => setUserApiKey(e.target.value)}
                    placeholder="Enter API Key..."
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-600 focus:bg-white outline-none transition-all font-mono text-sm text-slate-900"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-xl">
                  {userApiKey ? 'Activate Pro Mode' : 'Switch to Free Mode'}
                </button>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-center text-xs text-indigo-600 font-black uppercase tracking-widest hover:underline py-2">
                  Get Free API Key from Google →
                </a>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-12 flex-grow w-full">
        {status === AnalysisStatus.IDLE && (
          <div className="text-center py-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="mb-6 flex justify-center">
               <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-100">
                 Universal File Inspector
               </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-8 tracking-tight leading-tight">
              Safety check <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">anything instantly.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-500 max-w-xl mx-auto font-medium mb-12 leading-relaxed">
              Upload any file and I'll tell you if it's dangerous or what's inside. 
              Works with or without AI.
            </p>
            <div className="relative group max-w-xl mx-auto">
              <input type="file" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className="bg-white border-4 border-dashed border-slate-200 rounded-[3rem] p-16 flex flex-col items-center justify-center transition-all group-hover:border-indigo-400 group-hover:bg-indigo-50/10 shadow-xl shadow-slate-100">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-inner">
                  <Upload size={32} className="text-indigo-600" />
                </div>
                <p className="text-2xl font-black text-slate-900">Choose File</p>
                <p className="text-slate-400 text-xs font-black mt-2 uppercase tracking-[0.2em]">PDF • HTML • EXE • JS • ZIP</p>
              </div>
            </div>
          </div>
        )}

        {status === AnalysisStatus.LOADING && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="relative mb-8">
              <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping"></div>
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-800">Reading file signatures...</h3>
            <p className="text-slate-500 font-medium mt-2">Performing deep inspection {isProMode ? 'with AI' : 'locally'}.</p>
          </div>
        )}

        {status === AnalysisStatus.ERROR && (
          <div className="max-w-md mx-auto bg-white rounded-[2.5rem] p-10 border border-red-100 text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Analysis Interrupted</h3>
            <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">{error}</p>
            <button onClick={reset} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold active:scale-95 transition-all">Try Again</button>
          </div>
        )}

        {status === AnalysisStatus.SUCCESS && result && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-20">
            <div className={`rounded-[3rem] p-8 md:p-12 border-2 ${getVerdictStyle(result.verdict).bg} ${getVerdictStyle(result.verdict).border} shadow-2xl flex flex-col md:flex-row items-center gap-10`}>
              <div className="w-28 h-28 rounded-[2rem] flex items-center justify-center shrink-0 bg-white shadow-xl border-4 border-white/50">
                {React.cloneElement(getVerdictStyle(result.verdict).icon as React.ReactElement<any>, { className: getVerdictStyle(result.verdict).text })}
              </div>
              <div className="text-center md:text-left flex-grow">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                   <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${getVerdictStyle(result.verdict).text} bg-white border border-current shadow-sm`}>
                     {getVerdictStyle(result.verdict).label}
                   </span>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-white/50 text-slate-500 border border-slate-200">
                     {isProMode ? 'Deep AI' : 'Signature Scan'}
                   </span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">{result.humanVerdict}</h2>
                <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start text-slate-500 font-bold text-sm">
                  <div className="flex items-center gap-1.5 bg-white/40 px-3 py-1 rounded-lg border border-slate-200/50"><FileText size={16} /> {file?.name}</div>
                  <div className="flex items-center gap-1.5 bg-white/40 px-3 py-1 rounded-lg border border-slate-200/50">{formatBytes(file?.size || 0)}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-xl group hover:border-indigo-100 transition-all">
                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 rounded-2xl group-hover:scale-110 transition-transform"><Info className="text-indigo-600" size={24} /></div>
                  Analysis Summary
                </h3>
                <p className="text-slate-600 leading-relaxed font-medium text-lg">{result.simpleExplanation}</p>
              </div>
              <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-xl group hover:border-indigo-100 transition-all">
                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 rounded-2xl group-hover:scale-110 transition-transform"><CheckCircle2 className="text-emerald-600" size={24} /></div>
                  Recommendations
                </h3>
                <ul className="space-y-4">
                  {result.solutions.map((s, i) => (
                    <li key={i} className="flex gap-4 text-slate-700 font-bold text-base md:text-lg">
                      <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center shrink-0 mt-1">
                        <ArrowRight size={14} className="text-slate-400" />
                      </div>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {isProMode ? (
              <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden flex flex-col h-[700px]">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                  <div className="flex items-center gap-4 text-slate-900">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <MessageSquare size={24} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-black text-lg">OmniAI File Assistant</h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Pro Context Insight</p>
                    </div>
                  </div>
                </div>
                <div className="flex-grow overflow-y-auto p-8 space-y-8 scroll-smooth">
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-300">
                      <Bot size={64} className="mb-6 opacity-20 text-slate-900" />
                      <p className="text-xl font-black text-slate-400">Ask me anything about the content of this file.</p>
                    </div>
                  )}
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white border text-indigo-600 shadow-sm'}`}>
                           {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                         </div>
                         <div className={`p-5 rounded-3xl text-base md:text-lg font-medium shadow-sm leading-relaxed ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white text-slate-800 border border-slate-100'}`}>
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isChatting && (
                    <div className="flex justify-start items-center gap-3 p-4">
                      <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center animate-bounce">
                        <Bot size={16} className="text-indigo-400" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-indigo-400">Thinking...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="p-8 border-t border-slate-50 bg-white">
                  <div className="relative group">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Ask a question about this file..."
                      disabled={isChatting}
                      className="w-full bg-slate-50 border-2 border-transparent rounded-[2rem] pl-8 pr-20 py-6 text-lg font-bold outline-none focus:bg-white focus:border-indigo-600 text-slate-900 transition-all"
                    />
                    <button 
                      type="submit" 
                      disabled={!inputMessage.trim() || isChatting} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-600 text-white p-4 rounded-2xl hover:bg-indigo-700 disabled:opacity-20 transition-all shadow-lg"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[3rem] p-12 text-white text-center shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform duration-700">
                    <Zap size={120} fill="white" />
                 </div>
                 <div className="relative z-10">
                   <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Sparkles size={32} fill="white" />
                   </div>
                   <h3 className="text-3xl font-black mb-4">Unlock AI Deep Analysis</h3>
                   <p className="text-white/80 font-bold text-lg max-w-lg mx-auto mb-10 leading-relaxed">
                     Switch to Pro Mode to use Google Gemini for deep content inspection, suspicious code detection, and interactive chat.
                   </p>
                   <button 
                    onClick={() => setShowSettings(true)}
                    className="bg-white text-indigo-600 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-50 transition-all active:scale-95 shadow-xl"
                   >
                     Setup My API Key
                   </button>
                 </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="py-16 border-t border-slate-100 text-center bg-white px-4">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <p className="text-slate-900 font-black text-xl md:text-2xl tracking-tight">
              Tarunjit <span className="text-indigo-600">Biswas</span>
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
              <a 
                href="https://www.linkedin.com/in/tarunjit-biswas-a5248131b/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all font-bold text-xs border border-slate-100"
              >
                <Linkedin size={14} />
                LinkedIn Profile
              </a>
              <a 
                href="mailto:tarunjitbiswas24@gmail.com"
                className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all font-bold text-xs border border-slate-100"
              >
                <Mail size={14} />
                tarunjitbiswas24@gmail.com
              </a>
            </div>
          </div>
          
          <div className="h-px w-24 bg-slate-100"></div>

          <div className="flex flex-col items-center gap-4 opacity-70">
            <div className="flex items-center gap-2 text-slate-400">
               <Shield size={14} />
               <span className="text-[10px] font-black uppercase tracking-[0.3em]">Privacy-First Signature Engine</span>
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
              OmniAnalyze • Built in 2026 • Safeguarding Digital Assets
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
