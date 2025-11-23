import { Store, Utensils, Hospital, ShoppingBag, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';

const categories = [
  { icon: Store, label: 'Shops', path: '/search?category=grocery' },
  { icon: Utensils, label: 'Restaurants', path: '/search?category=restaurant' },
  { icon: Hospital, label: 'Hospitals', path: '/search?category=pharmacy' },
  { icon: ShoppingBag, label: 'Markets', path: '/search?category=other' },
  { icon: Wrench, label: 'Services', path: '/search?category=hardware' },
];

export const QuickAccessCategories = () => {
  return (
    <div className="py-6">
      <h2 className="text-lg font-bold mb-4 px-4">Quick Access</h2>
      <div className="flex items-center justify-around px-4">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Link
              key={category.label}
              to={category.path}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                <Icon className="h-7 w-7 text-accent-foreground" />
              </div>
              <span className="text-xs font-medium text-center">{category.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
