"use client";

import React from 'react';
import { Check, CheckCheck, Clock } from 'lucide-react';
import { MessageStatus } from '@/lib/types';

interface StatusCheckProps {
  statuses?: MessageStatus[];
  status?: string;
  className?: string;
}

export const StatusCheck: React.FC<StatusCheckProps> = ({
  statuses,
  status,
  className = '',
}) => {
  if (status === 'sending') {
    return <Clock className={`w-3.5 h-3.5 text-gray-300 animate-spin ${className}`} />;
  }

  let finalStatus = status || 'sent';

  if (statuses && Array.isArray(statuses) && statuses.length > 0) {
    const isRead = statuses.some(
      (s) => s.status?.toString().toLowerCase() === 'read'
    );
    const isDelivered = statuses.some(
      (s) => s.status?.toString().toLowerCase() === 'delivered'
    );

    if (isRead) {
      finalStatus = 'read';
    } else if (isDelivered) {
      finalStatus = 'delivered';
    } else {
      finalStatus = 'sent';
    }
  }

  if (finalStatus?.toString().toLowerCase() === 'read') {
    return (
      <CheckCheck
        className={`w-3.5 h-3.5 text-sky-300 font-bold ${className}`}
        title="Read"
      />
    );
  }

  if (finalStatus?.toString().toLowerCase() === 'delivered') {
    return (
      <CheckCheck
        className={`w-3.5 h-3.5 text-blue-100/90 ${className}`}
        title="Delivered"
      />
    );
  }

  return (
    <Check
      className={`w-3.5 h-3.5 text-blue-100/90 ${className}`}
      title="Sent"
    />
  );
};
