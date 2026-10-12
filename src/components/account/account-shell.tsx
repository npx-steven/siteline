"use client";

import { AccountData } from "@/types/account";
import { useState } from "react";
import AccountHeader from "./account-header";
import CompanyCard from "./company-card";
import ContactInfo from "./contact-info";
import EditAccountDrawer from "./edit-account-drawer";
import EditCompanyDrawer from "./edit-company-drawer";
import InviteDrawer from "./invite-drawer";
import SignOutButton from "../auth/sign-out-button";

function AccountShell({ data }: { data: AccountData }) {
  const { profile, company, members, requestCount } = data;
  const [editAccountOpen, setEditAccountOpen] = useState(false);
  const [editCompanyOpen, setEditCompanyOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const openEditAccount = () => setEditAccountOpen(true);
  const openEditCompany = () => setEditCompanyOpen(true);
  const openInvite = () => setInviteOpen(true);

  return (
    <div className="px-4 pb-32 h-dvh overflow-y-auto">
      <h1 className="text-3xl font-bold tracking-tight py-6">Account</h1>
      <div>
        <AccountHeader
          profile={profile}
          companyName={company.name}
          onEdit={openEditAccount}
        />
      </div>
      <div>
        <CompanyCard
          company={company}
          role={profile.role}
          memberCount={members.count}
          memberNames={members.names}
          requestCount={requestCount}
          onEdit={openEditCompany}
          onInvite={openInvite}
        />
      </div>
      <div>
        <ContactInfo profile={profile} onEdit={openEditAccount} />
      </div>
      <div>
        <SignOutButton />
      </div>

      <EditAccountDrawer
        open={editAccountOpen}
        onOpenChange={setEditAccountOpen}
        profile={profile}
      />

      <EditCompanyDrawer
        open={editCompanyOpen}
        onOpenChange={setEditCompanyOpen}
        company={company}
      />
      <InviteDrawer
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        companyName={company.name}
      />
    </div>
  );
}

export default AccountShell;
