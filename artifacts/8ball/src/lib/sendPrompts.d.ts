export interface PreparedPrompt {
  ticket: string;
  researchRounds?: number;
  state: string;
  question: {
    type: 'noul' | 'choice';
    instructions: string;
    criteria?: Record<string, string>;
  };
}
export interface DecisionResult {
  researchRounds?: number;
  type: 'noul' | 'choice';
  question: string;
  answer: string;
  probability?: number;
  options: Array<{ key: string; label: string; weight: number }>;
}
export interface DecisionAccess { limit: number; remaining: number; networkLimited: boolean }
export function getDecisionAccess(signal?: AbortSignal): Promise<DecisionAccess>;
export function toJevPrompt(userInput: string, signal?: AbortSignal, apiKey?: string): Promise<PreparedPrompt>;
export function getJevResponse(prompt: PreparedPrompt, signal?: AbortSignal, apiKey?: string): Promise<DecisionResult>;
