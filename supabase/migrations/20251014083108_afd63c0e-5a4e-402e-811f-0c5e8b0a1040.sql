-- Create messages table for customer-owner communication
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'owner')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Customers can view their own messages
CREATE POLICY "Customers can view their messages"
ON public.messages FOR SELECT
USING (auth.uid() = user_id);

-- Store owners can view messages for their stores
CREATE POLICY "Store owners can view store messages"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = messages.store_id
    AND stores.owner_id = auth.uid()
  )
);

-- Customers can send messages
CREATE POLICY "Customers can send messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = user_id AND sender_type = 'customer');

-- Store owners can reply to messages
CREATE POLICY "Store owners can reply to messages"
ON public.messages FOR INSERT
WITH CHECK (
  sender_type = 'owner' AND
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = messages.store_id
    AND stores.owner_id = auth.uid()
  )
);

-- Update messages as read
CREATE POLICY "Users can update their received messages"
ON public.messages FOR UPDATE
USING (
  (sender_type = 'customer' AND EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = messages.store_id
    AND stores.owner_id = auth.uid()
  )) OR
  (sender_type = 'owner' AND auth.uid() = user_id)
);

-- Create index for faster queries
CREATE INDEX idx_messages_store_id ON public.messages(store_id);
CREATE INDEX idx_messages_user_id ON public.messages(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();