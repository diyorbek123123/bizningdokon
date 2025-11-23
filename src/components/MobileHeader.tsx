import { Link } from 'react-router-dom';
import { Bell, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export const MobileHeader = () => {
  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <span className="text-xl font-bold text-primary">SHOXA</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">Tashkent</span>
          </Button>
          
          <Link to="/messages">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                3
              </Badge>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};
