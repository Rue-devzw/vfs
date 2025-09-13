import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { StoreLayout } from "@/components/pages/store/store-layout";
import { CartProvider } from "@/components/pages/store/cart-context";

export default function StorePage() {
  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-grow bg-background">
          <StoreLayout />
        </main>
        <Footer />
      </div>
    </CartProvider>
  );
}
