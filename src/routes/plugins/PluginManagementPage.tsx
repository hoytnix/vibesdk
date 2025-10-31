// src/routes/plugins/PluginManagementPage.tsx
import React, { useState, useEffect } from 'react';
import InstalledPlugins from './InstalledPlugins';
import DiscoverPlugins from './DiscoverPlugins';

const PluginManagementPage: React.FC = () => {
  const [installedPlugins, setInstalledPlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInstalledPlugins = () => {
    setLoading(true);
    setError(null);
    fetch('/api/plugins/installed')
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch installed plugins.');
        }
        return res.json();
      })
      .then(data => {
        setInstalledPlugins(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchInstalledPlugins();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Plugin Management</h1>
      <hr />
      <InstalledPlugins
        installedPlugins={installedPlugins}
        loading={loading}
        error={error}
        fetchInstalledPlugins={fetchInstalledPlugins}
      />
      <hr />
      <DiscoverPlugins onInstallSuccess={fetchInstalledPlugins} />
    </div>
  );
};

export default PluginManagementPage;
