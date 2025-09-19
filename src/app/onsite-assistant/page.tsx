import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { OnsiteAssistantChat } from "@/components/pages/onsite-assistant/assistant-chat";
import { MessageSquare } from "lucide-react";

export default function OnsiteAssistantPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-grow bg-background py-12 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-4xl space-y-12">
            <section className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MessageSquare className="h-8 w-8" />
              </div>
              <h1 className="font-headline text-4xl font-bold md:text-5xl">Onsite Assistant</h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Chat with our AI assistant to get instant answers from Valley Farm Secrets' onsite information about services,
                locations, wholesale support, and more.
              </p>
              <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
                Need extra help? We'll automatically forward your conversation to our WhatsApp helpline (+263 788 679 000 / +263
                711 406 919) and email team at info@valleyfarmsecrets.com whenever a human follow-up is required.
              </p>
            </section>
            <OnsiteAssistantChat />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
