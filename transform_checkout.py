import re

with open("src/components/pages/store/checkout-dialog.tsx", "r") as f:
    code = f.read()

# Add framer-motion and lucide-react imports
imports_addition = """
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronRight, Download, Camera, MapPin, CreditCard, ChevronLeft, ReceiptText } from "lucide-react";
import Image from "next/image";
"""
code = code.replace('import { Loader2 } from "lucide-react";', 'import { Loader2 } from "lucide-react";' + imports_addition)

# Add new state variables
state_addition = """
  const [currentStep, setCurrentStep] = React.useState(0);
  const [receiptItemsSnapshot, setReceiptItemsSnapshot] = React.useState<typeof state.items>([]);
"""
code = code.replace('const { state, dispatch } = useCart();', 'const { state, dispatch } = useCart();' + state_addition)

# Update isOpen effect to reset new states
isopen_effect_orig = """    if (!isOpen) {
      setIsAwaitingGatewayStatus(false);
      setPaymentStatus(null);
      setProfileHydrated(false);
      setSavedAddresses([]);
      setDeliveryQuote(null);
      submitKeyRef.current = null;
    }"""
isopen_effect_new = """    if (!isOpen) {
      setIsAwaitingGatewayStatus(false);
      setPaymentStatus(null);
      setProfileHydrated(false);
      setSavedAddresses([]);
      setDeliveryQuote(null);
      submitKeyRef.current = null;
      setCurrentStep(0);
      setReceiptItemsSnapshot([]);
    }"""
code = code.replace(isopen_effect_orig, isopen_effect_new)

# Add handleNextStep before onSubmit
next_step_func = """
  const handleNextStep = async (e: React.MouseEvent) => {
    e.preventDefault();
    const valid = await form.trigger([
      "isDiasporaGift",
      "recipientName",
      "recipientPhone",
      "deliveryMethod",
      "customerName",
      "customerPhone",
      "deliveryZoneId",
      "customerAddress",
      "deliveryInstructions",
      "customerEmail"
    ]);
    if (valid) {
      setCurrentStep(1);
    } else {
      toast({ title: "Incomplete Details", description: "Please check all required fields in the Delivery section before proceeding.", variant: "destructive" });
    }
  };
"""
code = code.replace('async function onSubmit(values: z.infer<typeof formSchema>) {', next_step_func + '\n  async function onSubmit(values: z.infer<typeof formSchema>) {')

# Inject SNAPSHOT and setCurrentStep(2) in step 1 final
code = code.replace("""          if (isSuccessfulGatewayStatus(finalStatus)) {
            submitKeyRef.current = null;
            dispatch({ type: "CLEAR_CART" });
            toast({
              title: "Payment successful",
              description: "Transaction confirmed. You can now download your receipt.",
            });
            return;
          }""", """          if (isSuccessfulGatewayStatus(finalStatus)) {
            submitKeyRef.current = null;
            setReceiptItemsSnapshot([...state.items]);
            dispatch({ type: "CLEAR_CART" });
            setCurrentStep(2);
            toast({
              title: "Payment successful",
              description: "Transaction confirmed. You can now download your receipt.",
            });
            return;
          }""")

# Inject SNAPSHOT and setCurrentStep(2) in leg 2 final
# (this one requires regex since it has more lines)
code = re.sub(
    r'(if \(isSuccessfulGatewayStatus\(status\)\) \{\s*submitKeyRef.current = null;\s*)dispatch\(\{ type: "CLEAR_CART" \}\);',
    r'\1setReceiptItemsSnapshot([...state.items]); dispatch({ type: "CLEAR_CART" });\n        setCurrentStep(2);',
    code,
    count=1
)

code = re.sub(
    r'(if \(isSuccessfulGatewayStatus\(finalStatus\)\) \{\s*submitKeyRef.current = null;\s*)dispatch\(\{ type: "CLEAR_CART" \}\);',
    r'\1setReceiptItemsSnapshot([...state.items]); dispatch({ type: "CLEAR_CART" });\n          setCurrentStep(2);',
    code,
    count=1
)

with open("patched.tsx", "w") as f:
    f.write(code)
print("Transforms basic logic completed. Checking for UI modifications")
