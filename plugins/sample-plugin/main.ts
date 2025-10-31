// plugins/sample-plugin/main.ts
// @ts-nocheck

// Filter Hook: Modifies the incoming prompt
const modifyPrompt = (prompt: string): string => {
  console.log('Original Prompt:', prompt);
  const modifiedPrompt = `${prompt}\\n\\n---\\n**Note:** This prompt has been modified by the Sample Plugin.`;
  console.log('Modified Prompt:', modifiedPrompt);
  return modifiedPrompt;
};

// Action Hook: Logs agent decisions for auditing
const logAgentDecision = (decision: any): void => {
  console.log('--- Sample Plugin Audit Log ---');
  console.log('Agent made a decision:', decision);
  console.log('-----------------------------');
};

// Register the hooks with the PluginRegistry
function initializePlugin() {
    if (globalThis.PluginRegistry) {
        globalThis.PluginRegistry.addHook('onAgentRequestStart', modifyPrompt);
        globalThis.PluginRegistry.addHook('onAgentDecision', logAgentDecision);
        console.log('Sample Plugin initialized and hooks registered.');
    } else {
        console.error('PluginRegistry not found on global scope.');
    }
}

// Ensure the plugin is initialized when it's loaded
initializePlugin();
