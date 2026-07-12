import React from 'react';
import { useAuthRedux } from '../../hooks/useAuthRedux';
import useWhatsAppInbox from '../../hooks/useWhatsAppInbox';
import InboxHeader from '../../components/WhatsApp/InboxHeader';
import ContactList from '../../components/WhatsApp/ContactList';
import ChatWindow from '../../components/WhatsApp/ChatWindow';
import { MessageCircle } from 'lucide-react';

const WhatsAppInboxPage: React.FC = () => {
  const { user } = useAuthRedux();
  const businessId = user?.businessId;
  const inbox = useWhatsAppInbox(businessId ?? undefined);

  const showMobileChat = Boolean(inbox.selectedPhone);
  const showMobileList = !showMobileChat;

  if (!businessId) {
    return (
      <div className="p-6 text-muted-foreground">No organization context found.</div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] sm:h-[calc(100vh-4rem)] overflow-hidden">
      <InboxHeader
        orgMode={inbox.orgMode}
        totalUnread={inbox.totalUnread}
        onPrefsChange={inbox.setInboxPrefs}
      />

      <div className="flex flex-1 min-h-0">
        {/* Desktop: always show list */}
        <div className="hidden sm:flex w-80 shrink-0 min-h-0">
          <ContactList
            conversations={inbox.conversations}
            selectedPhone={inbox.selectedPhone}
            onSelect={inbox.selectConversation}
            orgMode={inbox.orgMode}
            loading={inbox.loadingConversations}
          />
        </div>

        {/* Mobile: list OR chat full screen */}
        <div className={`sm:hidden w-full min-h-0 ${showMobileList ? 'flex' : 'hidden'}`}>
          <ContactList
            conversations={inbox.conversations}
            selectedPhone={inbox.selectedPhone}
            onSelect={inbox.selectConversation}
            orgMode={inbox.orgMode}
            loading={inbox.loadingConversations}
          />
        </div>

        <div
          className={`flex-1 min-w-0 flex flex-col min-h-0 ${
            showMobileChat ? 'flex' : 'hidden sm:flex'
          }`}
        >
          {inbox.selectedPhone ? (
            <ChatWindow
              phone={inbox.selectedPhone}
              messages={inbox.messages}
              orgMode={inbox.orgMode}
              onSendReply={inbox.sendReply}
              sending={inbox.sending}
              replyTemplates={inbox.replyTemplates}
              loading={inbox.loadingMessages}
              onBack={inbox.clearSelection}
            />
          ) : (
            <div className="hidden sm:flex flex-1 flex-col items-center justify-center text-muted-foreground gap-3 p-8">
              <MessageCircle className="h-16 w-16 opacity-20" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm text-center max-w-sm">
                {inbox.loadingConversations
                  ? 'Loading conversations…'
                  : inbox.conversations.length === 0
                    ? 'No WhatsApp messages yet. Messages will appear here when customers write to you.'
                    : 'Choose a contact from the list to view messages.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppInboxPage;
