import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  storeId: string;
}

export const ProductCard = ({ id, name, price, image_url, storeId }: ProductCardProps) => {
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  const addToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setAdding(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Login required',
          description: 'Please login to add items to cart',
          variant: 'destructive'
        });
        return;
      }

      // Check if item already exists in cart
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', id)
        .maybeSingle();

      if (existing) {
        // Update quantity
        await supabase
          .from('cart_items')
          .update({ quantity: existing.quantity + 1 })
          .eq('id', existing.id);
      } else {
        // Insert new item
        await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            store_id: storeId,
            product_id: id,
            quantity: 1
          });
      }

      toast({ title: 'Added to cart' });
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({ title: 'Error adding to cart', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="aspect-square w-full overflow-hidden bg-muted relative">
        {image_url ? (
          <img
            src={image_url}
            alt={name}
            className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
            <span className="text-4xl font-bold text-muted-foreground">
              {name.charAt(0)}
            </span>
          </div>
        )}
        
        <button
          onClick={addToCart}
          disabled={adding}
          className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-110 transition-transform shadow-lg opacity-0 group-hover:opacity-100"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-base line-clamp-2 mb-2">{name}</h3>
        <p className="text-lg font-bold text-primary">$ {price.toFixed(2)}</p>
      </div>
    </Card>
  );
};