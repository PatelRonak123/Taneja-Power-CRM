import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState('products');

  return (
    <div className="app-layout">
      <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />
      <div className="app-main-content">
        <Header />
        <main className="content-container">{children}</main>
      </div>
    </div>
  );
};
