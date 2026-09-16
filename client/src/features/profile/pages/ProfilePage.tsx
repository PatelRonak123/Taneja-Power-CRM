import React from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { ProfileHeaderCard } from '../components/ProfileHeaderCard';
import { AccountDetailsCard } from '../components/AccountDetailsCard';
import { SecurityPasswordCard } from '../components/SecurityPasswordCard';
import { RolePermissionsCard } from '../components/RolePermissionsCard';

export const ProfilePage: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Top Banner Card */}
      <ProfileHeaderCard user={user} />

      {/* Main Grid: Details, Password Change, Permissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Details Card */}
        <AccountDetailsCard user={user} />

        {/* Security & Password Card */}
        <SecurityPasswordCard />

        {/* Permissions & Security Scope Card */}
        <div className="lg:col-span-2">
          <RolePermissionsCard role={user?.role} />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
