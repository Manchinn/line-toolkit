import { ArrowLeftRight, CircleDashed, Link, MessageSquare, Send, type LucideIcon } from 'lucide-react';
import type { ActionType } from '@/types/line';
import { cn } from '@/lib/utils';

const ICONS: Record<ActionType, LucideIcon> = {
  uri: Link,
  message: MessageSquare,
  richmenuswitch: ArrowLeftRight,
  postback: Send,
  none: CircleDashed,
};

interface ActionIconProps {
  type: ActionType;
  className?: string;
}

export default function ActionIcon({ type, className }: ActionIconProps) {
  const Icon = ICONS[type] ?? CircleDashed;
  return <Icon className={cn('h-3 w-3', className)} aria-hidden="true" />;
}
