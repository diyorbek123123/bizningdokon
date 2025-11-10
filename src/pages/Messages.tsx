import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '@/components/Sidebar';
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
  last_sender_name: string;
  is_last_sender_current_user: boolean;
  other_user_id?: string;
  sender_avatar?: string;
  sender_name?: string;
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

    // Subscribe to realtime updates
    const channel = supabase
      .channel('messages-list-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          if (userId) {
            fetchConversations(userId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

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
      // First, get stores owned by user
      const { data: ownedStores } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_id', currentUserId);

      const ownedStoreIds = ownedStores?.map(s => s.id) || [];

      // Get messages where user is the sender OR messages for stores they own
      const { data: userMessages, error: userMessagesError } = await supabase
        .from('messages')
        .select(`
          store_id,
          message,
          created_at,
          sender_type,
          is_read,
          user_id,
          stores (
            name,
            owner_id
          )
        `)
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (userMessagesError) throw userMessagesError;

      // Get messages for stores owned by user
      let ownerMessages: any[] = [];
      if (ownedStoreIds.length > 0) {
        const { data, error: ownerMessagesError } = await supabase
          .from('messages')
          .select(`
            store_id,
            message,
            created_at,
            sender_type,
            is_read,
            user_id,
            stores (
              name,
              owner_id
            )
          `)
          .in('store_id', ownedStoreIds)
          .order('created_at', { ascending: false });

        if (ownerMessagesError) throw ownerMessagesError;
        ownerMessages = data || [];
      }

      // Combine and sort messages by latest timestamp
      const allMessages = [...(userMessages || []), ...ownerMessages];
      allMessages.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Get unique user IDs to fetch their profiles
      const userIds = [...new Set(allMessages.map((m: any) => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      // Also fetch store owner profiles
      const storeOwnerIds = [...new Set(allMessages.map((m: any) => m.stores?.owner_id).filter(Boolean))];
      const { data: ownerProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', storeOwnerIds);
      
      const ownerProfilesMap = new Map(ownerProfiles?.map(p => [p.id, p]) || []);

      // Group by store and pick the latest message per store
      const conversationsMap = new Map<string, Conversation>();

      allMessages.forEach((msg: any) => {
        const storeId = msg.store_id;
        const isOwner = ownedStoreIds.includes(storeId);
        const key = isOwner ? `${storeId}:${msg.user_id}` : storeId;
        if (conversationsMap.has(key)) return;

        // Count unread messages for this store (and user thread if owner)
        const unreadCount = allMessages.filter((m: any) =>
          m.store_id === storeId &&
          (!isOwner || m.user_id === msg.user_id) &&
          !m.is_read &&
          ((isOwner && m.sender_type === 'customer') || (!isOwner && m.sender_type === 'owner'))
        ).length;

        const isCurrentUserSender = (!isOwner && msg.sender_type === 'customer' && msg.user_id === currentUserId) ||
          (isOwner && msg.sender_type === 'owner');
        
        const senderProfile = profilesMap.get(msg.user_id);
        const ownerProfile = ownerProfilesMap.get(msg.stores?.owner_id);
        const lastSenderName = isCurrentUserSender ? 'You' : (senderProfile?.full_name || msg.sender_type === 'owner' ? 'Owner' : 'Customer');

        conversationsMap.set(key, {
          store_id: storeId,
          store_name: msg.stores?.name || 'Unknown Store',
          last_message: msg.message,
          last_message_time: msg.created_at,
          unread_count: unreadCount,
          is_owner: isOwner,
          last_sender_name: lastSenderName,
          is_last_sender_current_user: isCurrentUserSender,
          other_user_id: isOwner ? msg.user_id : undefined,
          sender_avatar: isOwner ? senderProfile?.avatar_url : ownerProfile?.avatar_url,
          sender_name: isOwner ? senderProfile?.full_name : ownerProfile?.full_name,
        });
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
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <div className="flex-1 ml-16">
          <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="h-32 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <div className="flex-1 ml-16">
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
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <div
                key={`${conversation.store_id}-${conversation.other_user_id || 'customer'}`}
                className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg cursor-pointer transition-colors group"
                onClick={() =>
                  conversation.is_owner && conversation.other_user_id
                    ? navigate(`/chat/${conversation.store_id}?with=${conversation.other_user_id}`)
                    : navigate(`/chat/${conversation.store_id}`)
                }
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {conversation.sender_avatar ? (
                      <img src={conversation.sender_avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Store className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  {conversation.unread_count > 0 && (
                    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary-foreground">
                        {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-semibold text-sm truncate flex-1">
                      {conversation.is_owner ? conversation.sender_name || conversation.last_sender_name : conversation.store_name}
                    </h3>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {new Date(conversation.last_message_time).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: false 
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {conversation.is_owner && (
                      <Store className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    )}
                    <p className="text-xs text-muted-foreground truncate">
                      {conversation.is_owner ? conversation.store_name : conversation.last_message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
