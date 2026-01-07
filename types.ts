
export interface AnalysisResult {
  verdict: 'SAFE' | 'CAUTION' | 'DANGER';
  humanVerdict: string;
  summary: string;
  simpleExplanation: string;
  isDangerous: boolean;
  whyItsDangerous?: string;
  solutions: string[];
  technicalDetails: string;
  fileType: string;
  metadata: Record<string, any>;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
