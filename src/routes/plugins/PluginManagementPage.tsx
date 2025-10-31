// src/routes/plugins/PluginManagementPage.tsx
import React from 'react';
import InstalledPlugins from './InstalledPlugins';
import DiscoverPlugins from './DiscoverPlugins';

const PluginManagementPage: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Plugin Management</h1>
      <hr />
      <InstalledPlugins />
      <hr />
      <DiscoverPlugins />
    </div>
  );
};

export default PluginManagementPage;
