// src/hooks.ts

// AI Agent Lifecycle
export type onAgentRequestStart = (prompt: string) => string;
export type onCodeBlockGenerated = (code: string) => string;

// Deep AI Agent (Tool/Reasoning)
export type beforeToolCall = (toolName: string, args: any) => void;
export type onAgentDecision = (decision: any) => void;

// Data & Resources
export type registerProjectTemplate = (templates: any[]) => any[];
export type beforeDatabaseQueryExecute = (query: string) => string;

// Monitoring & Isolation
export type onLLMResponse = (response: any) => void;
export type onSandboxResourceUsage = (usage: any) => void;

// User Interface (UI)
export type registerSettingPanel = (panels: any[]) => any[];
export type onChatInputPrepend = (input: string) => string;
