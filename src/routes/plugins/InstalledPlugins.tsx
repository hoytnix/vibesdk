// src/routes/plugins/InstalledPlugins.tsx
import React, { useState, useEffect } from 'react';
import PluginDetailsModal from './PluginDetailsModal';

const InstalledPlugins: React.FC = () => {
  const [installedPlugins, setInstalledPlugins] = useState<any[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<any | null>(null);

  useEffect(() => {
    // In a real app, this would fetch the list of installed plugins from the backend
    // For now, we'll keep the static list and add API calls for actions.
    setInstalledPlugins([
      { id: 'sample-plugin', name: 'Sample Plugin', version: '1.0.0', status: 'active' },
    ]);
  }, []);

  const handleDeactivate = (id: string) => {
    fetch(`/api/plugins/deactivate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pluginId: id }),
    }).then(() => {
      setInstalledPlugins(installedPlugins.map(p => p.id === id ? { ...p, status: 'inactive' } : p));
    });
  };

  const handleActivate = (id: string) => {
    fetch(`/api/plugins/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pluginId: id }),
    }).then(() => {
      setInstalledPlugins(installedPlugins.map(p => p.id === id ? { ...p, status: 'active' } : p));
    });
  };

  const handleUninstall = (id: string) => {
    fetch(`/api/plugins/uninstall`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pluginId: id }),
    }).then(() => {
      setInstalledPlugins(installedPlugins.filter(p => p.id !== id));
    });
  };

  return (
    <div>
      <h2>Installed Plugins</h2>
      <ul>
        {installedPlugins.map(plugin => (
          <li key={plugin.id}>
            {plugin.name} ({plugin.version}) - {plugin.status}
            {' '}
            {plugin.status === 'active' ? (
              <button onClick={() => handleDeactivate(plugin.id)}>Deactivate</button>
            ) : (
              <button onClick={() => handleActivate(plugin.id)}>Activate</button>
            )}
            <button onClick={() => handleUninstall(plugin.id)}>Uninstall</button>
            <button onClick={() => setSelectedPlugin(plugin)}>Details</button>
          </li>
        ))}
      </ul>
      {selectedPlugin && (
        <PluginDetailsModal plugin={selectedPlugin} onClose={() => setSelectedPlugin(null)} />
      )}
    </div>
  );
};

export default InstalledPlugins;
