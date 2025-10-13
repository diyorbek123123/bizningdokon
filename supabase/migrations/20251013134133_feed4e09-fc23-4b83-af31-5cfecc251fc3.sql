-- Create about_us table for editable content
CREATE TABLE public.about_us (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.about_us ENABLE ROW LEVEL SECURITY;

-- Everyone can view about us content
CREATE POLICY "Everyone can view about us" 
ON public.about_us 
FOR SELECT 
USING (true);

-- Only admins can insert about us content
CREATE POLICY "Only admins can insert about us" 
ON public.about_us 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update about us content
CREATE POLICY "Only admins can update about us" 
ON public.about_us 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete about us content
CREATE POLICY "Only admins can delete about us" 
ON public.about_us 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_about_us_updated_at
BEFORE UPDATE ON public.about_us
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default content
INSERT INTO public.about_us (title, content) VALUES (
  'About ShopFinder',
  'ShopFinder is your trusted platform for discovering local stores and comparing product prices across Uzbekistan. We help customers find the best deals while supporting local businesses to reach more customers. Our platform makes shopping smarter and more convenient for everyone.'
);