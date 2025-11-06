import { useState, useEffect } from 'react';
import { X, Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  products: {
    name: string;
    price: number;
    image_url: string | null;
  };
}

export const ShoppingCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          product_id,
          quantity,
          products (
            name,
            price,
            image_url
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setCartItems(data as any || []);
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId);

      if (error) throw error;
      loadCart();
    } catch (error) {
      toast({ title: 'Error updating quantity', variant: 'destructive' });
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      toast({ title: 'Item removed from cart' });
      loadCart();
    } catch (error) {
      toast({ title: 'Error removing item', variant: 'destructive' });
    }
  };

  const total = cartItems.reduce((sum, item) => 
    sum + (item.products.price * item.quantity), 0);

  const deliveryFee = 100;

  return (
    <aside className="fixed right-0 top-0 h-screen w-80 bg-card border-l border-border flex flex-col z-40 shadow-lg">
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-bold">Mi orden</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Listado del pedido</h3>
          {cartItems.length > 0 && (
            <span className="text-xs text-muted-foreground">{cartItems.length} items</span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">Your cart is empty</p>
          </div>
        ) : (
          cartItems.map(item => (
            <Card key={item.id} className="p-3 flex gap-3 items-start">
              <button
                onClick={() => removeItem(item.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              
              {item.products.image_url && (
                <img
                  src={item.products.image_url}
                  alt={item.products.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              )}
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm line-clamp-2">{item.products.name}</h4>
                <p className="text-sm font-bold text-primary">$ {item.products.price.toFixed(2)}</p>
                
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-6 h-6 rounded flex items-center justify-center bg-secondary hover:bg-muted transition-colors"
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-6 h-6 rounded flex items-center justify-center bg-secondary hover:bg-muted transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {cartItems.length > 0 && (
        <div className="p-6 border-t border-border space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Envío</span>
              <span className="font-semibold">$ {deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Items totales</span>
              <span className="font-semibold">$ {total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
              <span>Total</span>
              <span>$ {(total + deliveryFee).toFixed(2)}</span>
            </div>
          </div>
          
          <Button
            className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-full h-12 font-semibold"
            onClick={() => navigate('/checkout')}
          >
            Ir al checkout
          </Button>
        </div>
      )}
    </aside>
  );
};