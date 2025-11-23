import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { removeBackground, loadImage } from '@/utils/backgroundRemoval';
import originalLogo from '@/assets/shoxa-logo-original.png';

export const ProcessLogo = () => {
  const [processing, setProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const processLogo = async () => {
    setProcessing(true);
    try {
      // Fetch the original logo
      const response = await fetch(originalLogo);
      const blob = await response.blob();
      
      // Load as image element
      const imageElement = await loadImage(blob);
      
      // Remove background
      const resultBlob = await removeBackground(imageElement);
      
      // Create URL for preview
      const url = URL.createObjectURL(resultBlob);
      setProcessedImage(url);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = 'shoxa-logo.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Success!',
        description: 'Logo processed and downloaded. Replace shoxa-logo.png in src/assets with the downloaded file.',
      });
    } catch (error) {
      console.error('Error processing logo:', error);
      toast({
        title: 'Error',
        description: 'Failed to process logo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    // Auto-process on mount
    processLogo();
  }, []);

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-2xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Logo Background Removal</h1>
        
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Original Logo</h2>
            <img src={originalLogo} alt="Original Logo" className="w-full border rounded" />
          </div>

          {processedImage && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Processed Logo (Transparent Background)</h2>
              <div className="bg-checkered p-4 rounded">
                <img src={processedImage} alt="Processed Logo" className="w-full" />
              </div>
            </div>
          )}

          <Button 
            onClick={processLogo} 
            disabled={processing}
            className="w-full"
          >
            {processing ? 'Processing...' : 'Process Logo Again'}
          </Button>

          {processedImage && (
            <p className="text-sm text-muted-foreground">
              The processed logo has been downloaded. To use it in your navigation:
              <br />1. Replace the file at <code>src/assets/shoxa-logo.png</code> with the downloaded file
              <br />2. Update Navigation.tsx to import: <code>import shoxaLogo from '@/assets/shoxa-logo.png';</code>
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};
