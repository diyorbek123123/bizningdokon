import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  message: string;
  sender_type: 'customer' | 'owner';
  created_at: string;
  user_id: string;
}

interface StoreMessagesProps {
  storeId: string;
  isOwner?: boolean;
  recipientUserId?: string;
}

export const StoreMessages = ({ storeId, isOwner = false, recipientUserId }: StoreMessagesProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isStoreOwner, setIsStoreOwner] = useState(false);

  useEffect(() => {
    fetchMessages();
    checkUser();

    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `store_id=eq.${storeId}`
        },
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
    
    if (user?.id) {
      // Check if user is owner of this store
      const { data: store } = await supabase
        .from('stores')
        .select('owner_id')
        .eq('id', storeId)
        .single();
      
      setIsStoreOwner(isOwner || store?.owner_id === user.id);
    }
  };

  const fetchMessages = async () => {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: true });

    if (isStoreOwner) {
      if (recipientUserId) {
        query = query.eq('user_id', recipientUserId);
      }
    } else if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setMessages(data as Message[]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !userId) return;

    const targetUserId = isStoreOwner ? recipientUserId : userId;
    if (isStoreOwner && !recipientUserId) {
      toast({
        title: t('common.error'),
        description: 'Select a conversation first',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from('messages').insert({
        store_id: storeId,
        user_id: targetUserId,
        message: newMessage.trim(),
        sender_type: isStoreOwner ? 'owner' : 'customer'
      });

      if (error) throw error;

      setNewMessage('');
      toast({
        title: t('common.success'),
        description: t('messages.sent'),
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!userId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('messages.loginRequired')}
      </div>
    );
  }

  return (
    <div className="border rounded-lg h-[500px] flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold">{t('messages.title')}</h3>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              {t('messages.noMessages')}
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                (isStoreOwner ? msg.sender_type === 'owner' : msg.sender_type === 'customer') ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  (isStoreOwner ? msg.sender_type === 'owner' : msg.sender_type === 'customer')
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(msg.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isStoreOwner && !recipientUserId ? 'Select a conversation to reply...' : t('messages.placeholder')}
            disabled={isLoading || (isStoreOwner && !recipientUserId)}
            className="min-h-[60px]"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button onClick={sendMessage} disabled={isLoading || !newMessage.trim() || (isStoreOwner && !recipientUserId)}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};