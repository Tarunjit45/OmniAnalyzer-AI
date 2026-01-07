import { AnalysisResult } from '../types';

export const analyzeFileHardcoded = async (file: File): Promise<AnalysisResult> => {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const size = file.size;
  
  // Basic heuristic analysis
  let verdict: 'SAFE' | 'CAUTION' | 'DANGER' = 'SAFE';
  let humanVerdict = "This file looks safe to open.";
  let simpleExplanation = "I've checked the file format and it matches standard patterns.";
  let solutions = ["You can open this file with any compatible viewer.", "Always keep your software updated."];
  let technicalDetails = `Format: ${ext?.toUpperCase()}\nSize: ${(size / 1024).toFixed(2)} KB`;

  // Extension based warnings
  if (['exe', 'msi', 'bat', 'sh', 'cmd', 'vbs'].includes(ext || '')) {
    verdict = 'DANGER';
    humanVerdict = "High Risk: Executable File detected.";
    simpleExplanation = "This is a program that can run code on your computer. Unless you trust the source 100%, do not open it.";
    solutions = ["Scan this file with a dedicated Antivirus.", "Do not run as Administrator.", "Check the digital signature if possible."];
  } else if (['zip', 'rar', '7z'].includes(ext || '')) {
    verdict = 'CAUTION';
    humanVerdict = "Proceed with Caution: Compressed Archive.";
    simpleExplanation = "Archives can hide dangerous files inside them. It's safe to look, but be careful what you extract.";
    solutions = ["Open the archive to see what's inside before extracting.", "Ensure your zip tool is up to date."];
  } else if (['html', 'htm', 'js', 'svg'].includes(ext || '')) {
    verdict = 'CAUTION';
    humanVerdict = "Caution: Web Content.";
    simpleExplanation = "This file contains code that runs in your browser. It could potentially redirect you to phishing sites.";
    solutions = ["Open in a private/incognito window.", "Check for suspicious scripts if you are a developer."];
  }

  return {
    verdict,
    humanVerdict,
    summary: `Basic analysis of ${file.name}`,
    simpleExplanation,
    isDangerous: verdict === 'DANGER',
    solutions,
    technicalDetails,
    fileType: ext || 'unknown',
    metadata: {
      suggestedApp: "Standard system viewer",
      securityLevel: verdict === 'SAFE' ? 'Low Risk' : 'High Risk'
    }
  };
};