import React from 'react';
import { format } from 'date-fns';
import { Check, AlertTriangle } from 'lucide-react';
import type { WhatsAppInboxMessage } from '../../types/whatsapp-inbox';
import { getModelBadge, getModelBadgeClasses } from '../../utils/aiModelBadge';

interface Props {
  message: WhatsAppInboxMessage;
}

const MessageBubble: React.FC<Props> = ({ message }) => {
  const isIncoming = message.direction === 'incoming';
  const isFailed = message.status === 'failed';
  const isAiReply = !isIncoming && message.autoReplied && message.aiModel;
  const badge = isAiReply ? getModelBadge(message.aiModel) : null;
  const time = format(new Date(message.createdAt), 'h:mm a');

  if (isIncoming) {
    return (
      <div className="flex justify-start mb-3">
        <div className="max-w-[85%] sm:max-w-[75%]">
          <p className="text-xs text-muted-foreground mb-1 ml-1">Customer</p>
          <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
            <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
            <p className="text-[10px] text-gray-500 text-right mt-1">{time}</p>
          </div>
        </div>
      </div>
    );
  }

  const bubbleColor = isFailed
    ? 'bg-red-50 text-red-900 border-2 border-red-300'
    : isAiReply
      ? 'bg-green-600 text-white'
      : 'bg-blue-500 text-white';

  return (
    <div className="flex justify-end mb-3">
      <div className="max-w-[75%]">
        {badge && (
          <span
            className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 mb-1 float-right ${getModelBadgeClasses(badge.color)}`}
          >
            {badge.icon} {badge.name}
          </span>
        )}
        {!badge && !isFailed && (
          <p className="text-xs text-muted-foreground mb-1 mr-1 text-right">You</p>
        )}
        {isFailed && (
          <p className="text-xs text-red-600 mb-1 mr-1 text-right flex items-center justify-end gap-1">
            <AlertTriangle className="h-3 w-3" /> Failed
          </p>
        )}
        <div className={`rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm clear-both ${bubbleColor}`}>
          <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className={`text-[10px] ${isFailed ? 'text-red-500' : 'opacity-80'}`}>{time}</span>
            {!isFailed && message.status === 'sent' && (
              <Check className="h-3 w-3 opacity-80" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
