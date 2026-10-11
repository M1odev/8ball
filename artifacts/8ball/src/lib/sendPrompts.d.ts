export interface PreparedPrompt {
  state: string;
  question: {
    type: 'noul' | 'choice';
    instructions: string;
    criteria?: Record<string, string>;
  };
}
export interface DecisionResult {
  type: 'noul' | 'choice';
  question: string;
  answer: string;
  probability?: number;
  options: Array<{ key: string; label: string; weight: number }>;
}
export function toJevPrompt(userInput: string, signal?: AbortSignal): Promise<PreparedPrompt>;
export function getJevResponse(prompt: PreparedPrompt, signal?: AbortSignal): Promise<DecisionResult>;
