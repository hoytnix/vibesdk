
import React, { useState, useEffect } from 'react';
import PluginRegistry from '@/PluginRegistry';
import { type Message } from '../hooks/use-chat';

interface ChatMessageExtensionProps {
  message: Message;
}

const ChatMessageExtension: React.FC<ChatMessageExtensionProps> = ({ message }) => {
  const [components, setComponents] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    const fetchComponents = async () => {
      const components = await PluginRegistry.executeHook('onChatThreadPostMessage', [], message);
      setComponents(components);
    };
    fetchComponents();
  }, [message]);

  return (
    <>
      {components.map((component, index) => (
        <React.Fragment key={index}>{component}</React.Fragment>
      ))}
    </>
  );
};

export default ChatMessageExtension;
