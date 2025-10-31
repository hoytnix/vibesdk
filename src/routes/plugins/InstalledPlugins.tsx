// src/routes/plugins/InstalledPlugins.tsx
import React, { useState } from 'react';
import PluginDetailsModal from './PluginDetailsModal';

interface InstalledPluginsProps {
  installedPlugins: any[];
  loading: boolean;
  error: string | null;
  fetchInstalledPlugins: () => void;
}

const InstalledPlugins: React.FC<InstalledPluginsProps> = ({
  installedPlugins,
  loading,
  error,
  fetchInstalledPlugins,
}) => {
  const [selectedPlugin, setSelectedPlugin] = useState<any | null>(null);

  const handleDeactivate = (id: string) => {
    fetch(`/api/plugins/deactivate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pluginId: id }),
    }).then(fetchInstalledPlugins);
  };

  const handleActivate = (id: string) => {
    fetch(`/api/plugins/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pluginId: id }),
    }).then(fetchInstalledPlugins);
  };

  const handleUninstall = (id: string) => {
    fetch(`/api/plugins/uninstall`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pluginId: id }),
    }).then(fetchInstalledPlugins);
  };

  if (loading) {
    return <div>Loading installed plugins...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

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
