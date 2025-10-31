// src/routes/plugins/PluginDetailsModal.tsx
import React from 'react';

interface PluginDetailsModalProps {
  plugin: {
    name: string;
    version: string;
    author?: string;
    permissions?: {
      d1Read: boolean;
      d1Write: boolean;
      r2Read: boolean;
      externalFetch: boolean;
    };
  };
  onClose: () => void;
  isInstall?: boolean;
}

const PluginDetailsModal: React.FC<PluginDetailsModalProps> = ({ plugin, onClose, isInstall }) => {
  const handleInstall = () => {
    fetch('/api/plugins/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pluginId: plugin.name }), // Assuming name is unique for simplicity
    })
    .then(res => res.json())
    .then(data => {
      console.log('Install success:', data);
      onClose();
    });
  };

  return (
    <div style={{ position: 'fixed', top: '20%', left: '30%', width: '40%', background: 'white', padding: '20px', border: '1px solid black' }}>
      <h2>{plugin.name}</h2>
      <p>Version: {plugin.version}</p>
      {plugin.author && <p>Author: {plugin.author}</p>}

      {plugin.permissions && (
        <div>
          <h3>Permissions Required:</h3>
          <ul>
            {Object.entries(plugin.permissions).map(([key, value]) => value && <li key={key}>{key}</li>)}
          </ul>
        </div>
      )}

      <button onClick={onClose}>Close</button>
      {isInstall && <button onClick={handleInstall}>Install</button>}
    </div>
  );
};

export default PluginDetailsModal;
