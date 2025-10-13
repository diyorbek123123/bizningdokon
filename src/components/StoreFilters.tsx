import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StoreFiltersProps {
  onCategoryChange: (category: string | null) => void;
  onSortChange: (sort: string) => void;
  selectedCategory: string | null;
  selectedSort: string;
}

const categories = [
  { value: 'food', label: 'Food' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'health', label: 'Health' },
  { value: 'home', label: 'Home' },
  { value: 'sports', label: 'Sports' },
  { value: 'books', label: 'Books' },
  { value: 'toys', label: 'Toys' },
  { value: 'beauty', label: 'Beauty' },
  { value: 'other', label: 'Other' },
];

const sortOptions = [
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'distance', label: 'Nearest First' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest First' },
];

export const StoreFilters = ({ onCategoryChange, onSortChange, selectedCategory, selectedSort }: StoreFiltersProps) => {
  return (
    <Card className="mb-6 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters & Sort</span>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="category" className="text-xs text-muted-foreground">Category</Label>
            <div className="flex gap-2">
              <Select value={selectedCategory || 'all'} onValueChange={(v) => onCategoryChange(v === 'all' ? null : v)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCategory && (
                <Button variant="ghost" size="icon" onClick={() => onCategoryChange(null)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort" className="text-xs text-muted-foreground">Sort By</Label>
            <Select value={selectedSort} onValueChange={onSortChange}>
              <SelectTrigger id="sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[10000]">
                {sortOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
