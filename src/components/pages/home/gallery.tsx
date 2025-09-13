"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { generateImageCaption } from '@/app/_actions/ai';
import { Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type GalleryImage = {
    id: string;
    description: string;
    imageUrl: string;
    imageHint: string;
};

export function Gallery() {
  const { toast } = useToast();
  const galleryImages = PlaceHolderImages.filter(p => p.id.startsWith('gallery-'));

  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const handleGenerateCaption = async (image: GalleryImage) => {
    setLoadingStates(prev => ({ ...prev, [image.id]: true }));
    const result = await generateImageCaption(image.imageUrl);
    if (result.error) {
        toast({
            title: "Error",
            description: result.error,
            variant: "destructive",
        });
    } else if (result.caption) {
        setCaptions(prev => ({ ...prev, [image.id]: result.caption! }));
    }
    setLoadingStates(prev => ({ ...prev, [image.id]: false }));
  };

  return (
    <section id="gallery" className="py-16 md:py-24 bg-primary/5">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-headline text-3xl font-bold md:text-4xl">From Our Farm to You</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A glimpse into the freshness and quality we promise.
          </p>
        </div>
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="mx-auto mt-12 w-full max-w-5xl"
        >
          <CarouselContent>
            {galleryImages.map((image) => (
              <CarouselItem key={image.id} className="md:basis-1/2 lg:basis-1/3">
                <div className="p-1">
                  <Card className="overflow-hidden transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                    <CardContent className="relative flex aspect-4/3 items-center justify-center p-0">
                      <Image
                        src={image.imageUrl}
                        alt={captions[image.id] || image.description}
                        width={800}
                        height={600}
                        className="h-full w-full object-cover"
                        data-ai-hint={image.imageHint}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-0 w-full p-4 text-white">
                        <p className="text-sm min-h-[40px]">
                            {captions[image.id] || image.description}
                        </p>
                        <Button 
                            size="sm" 
                            className="mt-2 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                            onClick={() => handleGenerateCaption(image)}
                            disabled={loadingStates[image.id]}
                        >
                            {loadingStates[image.id] ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Sparkles className="mr-2 h-4 w-4" />
                            )}
                            Generate Caption
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="ml-12" />
          <CarouselNext className="mr-12" />
        </Carousel>
      </div>
    </section>
  );
}
