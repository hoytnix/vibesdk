// plugins/sample-plugin/main.ts
import PluginRegistry from '../../src/PluginRegistry';
import { onAgentRequestStart, onAgentDecision } from '../../src/hooks';

// Filter Hook: Modifies the incoming prompt
const modifyPrompt: onAgentRequestStart = (prompt: string): string => {
  console.log('Original Prompt:', prompt);
  const modifiedPrompt = `${prompt}\\n\\n---\\n**Note:** This prompt has been modified by the Sample Plugin.`;
  console.log('Modified Prompt:', modifiedPrompt);
  return modifiedPrompt;
};

// Action Hook: Logs agent decisions for auditing
const logAgentDecision: onAgentDecision = (decision: any): void => {
  console.log('--- Sample Plugin Audit Log ---');
  console.log('Agent made a decision:', decision);
  console.log('-----------------------------');
};

// Register the hooks with the PluginRegistry
function initializePlugin() {
    PluginRegistry.addHook('onAgentRequestStart', modifyPrompt);
    PluginRegistry.addHook('onAgentDecision', logAgentDecision);
    console.log('Sample Plugin initialized and hooks registered.');
}

// Ensure the plugin is initialized when it's loaded
initializePlugin();
