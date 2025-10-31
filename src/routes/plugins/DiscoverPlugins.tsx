// src/routes/plugins/DiscoverPlugins.tsx
import React, { useState, useEffect } from 'react';
import PluginDetailsModal from './PluginDetailsModal';

interface DiscoverPluginsProps {
  onInstallSuccess: () => void;
}

const DiscoverPlugins: React.FC<DiscoverPluginsProps> = ({ onInstallSuccess }) => {
  const [discoverablePlugins, setDiscoverablePlugins] = useState<any[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/plugins/discover')
      .then(res => res.json())
      .then(data => setDiscoverablePlugins(data));
  }, []);

  const handleInstallClick = (pluginId: string) => {
    fetch('/api/plugins/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pluginId }),
    }).then(() => {
      onInstallSuccess();
      setSelectedPlugin(null);
    });
  };

  return (
    <div>
      <h2>Discover Plugins</h2>
      <ul>
        {discoverablePlugins.map(plugin => (
          <li key={plugin.id}>
            {plugin.name} ({plugin.version}) by {plugin.author}
            {' '}
            <button onClick={() => setSelectedPlugin(plugin)}>Details</button>
            <button onClick={() => handleInstallClick(plugin.id)}>Install</button>
          </li>
        ))}
      </ul>
      {selectedPlugin && (
        <PluginDetailsModal plugin={selectedPlugin} onClose={() => setSelectedPlugin(null)} isInstall={true} />
      )}
    </div>
  );
};

export default DiscoverPlugins;
