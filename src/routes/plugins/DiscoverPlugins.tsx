// src/routes/plugins/DiscoverPlugins.tsx
import React, { useState, useEffect } from 'react';
import PluginDetailsModal from './PluginDetailsModal';

const DiscoverPlugins: React.FC = () => {
  const [discoverablePlugins, setDiscoverablePlugins] = useState<any[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/plugins/discover')
      .then(res => res.json())
      .then(data => setDiscoverablePlugins(data));
  }, []);

  const handleInstallClick = (plugin: any) => {
    // In a real app, we'd show a confirmation modal first
    // that lists the permissions, then call the install endpoint.
    setSelectedPlugin(plugin);
  };

  return (
    <div>
      <h2>Discover Plugins</h2>
      <ul>
        {discoverablePlugins.map(plugin => (
          <li key={plugin.id}>
            {plugin.name} ({plugin.version}) by {plugin.author}
            {' '}
            <button onClick={() => handleInstallClick(plugin)}>1-Click Install</button>
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
