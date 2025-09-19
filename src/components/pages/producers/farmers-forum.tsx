"use client";

import { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lightbulb, Loader2 } from "lucide-react";
import { generateFarmingTip } from '@/app/_actions/ai';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  topic: z.string().min(5, "Please enter a more specific topic."),
});

export function FarmersForum() {
  const [tip, setTip] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { topic: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setTip(null);
    const result = await generateFarmingTip(values.topic);
    if (result.error) {
        toast({
            title: "Error",
            description: result.error,
            variant: "destructive",
        });
    } else {
        setTip(result.tip);
    }
    setIsLoading(false);
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Farmers’ Forum AI</CardTitle>
        <CardDescription>
          Have a farming question? Get an instant, AI-powered tip from our agricultural expert.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-2">
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <FormControl>
                    <Input placeholder="e.g., how to prevent pests on tomatoes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get Tip"}
            </Button>
          </form>
        </Form>
        
        {(isLoading || tip) && <Separator className="my-6" />}
        
        {isLoading && (
            <div className="flex items-center text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                <span>Generating your tip...</span>
            </div>
        )}
        {tip && (
          <div className="rounded-lg bg-primary/5 p-4 animate-fade-in-up">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-8 w-8 flex-shrink-0 text-primary" />
              <p className="text-sm text-foreground">{tip}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
