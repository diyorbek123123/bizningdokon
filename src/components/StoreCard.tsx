import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StoreCardProps {
  id: string;
  name: string;
  description?: string;
  phone: string;
  address: string;
  photo_url?: string;
}

export const StoreCard = ({ id, name, description, phone, address, photo_url }: StoreCardProps) => {
  const { t } = useTranslation();

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
      <div className="aspect-video w-full overflow-hidden bg-muted">
        {photo_url ? (
          <img
            src={photo_url}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
            <span className="text-6xl font-bold text-muted-foreground opacity-20">
              {name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <h3 className="text-xl font-bold line-clamp-1">{name}</h3>
        
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4 text-primary" />
            <span>{phone}</span>
          </div>
          <div className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <span className="line-clamp-1">{address}</span>
          </div>
        </div>

        <Button asChild className="w-full">
          <Link to={`/store/${id}`}>
            {t('store.products')}
          </Link>
        </Button>
      </div>
    </Card>
  );
};
