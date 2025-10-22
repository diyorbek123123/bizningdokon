import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Store } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Conversation {
  store_id: string;
  store_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  is_owner: boolean;
}

const Messages = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkUserAndFetchConversations();
  }, []);

  const checkUserAndFetchConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: t('common.error'),
        description: t('messages.loginRequired'),
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    setUserId(user.id);
    await fetchConversations(user.id);
  };

  const fetchConversations = async (currentUserId: string) => {
    try {
      // Get messages where user is involved
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          store_id,
          message,
          created_at,
          sender_type,
          is_read,
          stores (
            name,
            owner_id
          )
        `)
        .or(`user_id.eq.${currentUserId},stores.owner_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Group messages by store
      const conversationsMap = new Map<string, Conversation>();
      
      messages?.forEach((msg: any) => {
        const storeId = msg.store_id;
        const isOwner = msg.stores?.owner_id === currentUserId;
        
        if (!conversationsMap.has(storeId)) {
          // Count unread messages
          const unreadCount = messages.filter((m: any) => 
            m.store_id === storeId && 
            !m.is_read && 
            ((isOwner && m.sender_type === 'customer') || (!isOwner && m.sender_type === 'owner'))
          ).length;

          conversationsMap.set(storeId, {
            store_id: storeId,
            store_name: msg.stores?.name || 'Unknown Store',
            last_message: msg.message,
            last_message_time: msg.created_at,
            unread_count: unreadCount,
            is_owner: isOwner,
          });
        }
      });

      setConversations(Array.from(conversationsMap.values()));
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="h-32 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <MessageCircle className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">{t('messages.title')}</h1>
        </div>

        {conversations.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground text-lg">{t('messages.noMessages')}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {conversations.map((conversation) => (
              <Card
                key={conversation.store_id}
                className="p-6 hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/store/${conversation.store_id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Store className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg truncate">
                          {conversation.store_name}
                        </h3>
                        {conversation.is_owner && (
                          <Badge variant="secondary" className="text-xs">
                            Owner
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm line-clamp-2">
                        {conversation.last_message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(conversation.last_message_time).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {conversation.unread_count > 0 && (
                    <Badge className="ml-4">
                      {conversation.unread_count} new
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
