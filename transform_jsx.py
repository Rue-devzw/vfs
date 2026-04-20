with open("patched.tsx", "r") as f:
    code = f.read()

prefix, suffix = code.split('  return (\n    <Dialog open={isOpen} onOpenChange={onOpenChange}>', 1)

new_jsx = """  return (
    <Dialog open={isOpen} onOpenChange={(val) => {
        if (!val) { onOpenChange(false); }
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-none shadow-2xl rounded-2xl">
        
        {/* Modern Stepper Header */}
        <div className="bg-muted/30 pt-8 pb-6 px-6 border-b">
            <DialogHeader>
                <DialogTitle className="font-headline text-3xl text-center mb-6">Checkout</DialogTitle>
                <DialogDescription className="sr-only">Checkout process</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center gap-2 max-w-sm mx-auto">
                {[ { label: "Details", icon: MapPin }, { label: "Payment", icon: CreditCard }, { label: "Complete", icon: ReceiptText } ].map((step, idx) => {
                   const Icon = step.icon;
                   const isActive = currentStep >= idx;
                   return (
                     <React.Fragment key={idx}>
                       <div className={`flex flex-col items-center gap-2 ${isActive ? "text-primary" : "text-muted-foreground opacity-50"}`}>
                         <div className={`h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 shadow-sm ${isActive ? "bg-primary text-primary-foreground border-primary" : "bg-card border-muted-foreground/30"}`}>
                           <Icon className="h-5 w-5" />
                         </div>
                         <span className="text-xs font-semibold">{step.label}</span>
                       </div>
                       {idx < 2 && <div className={`w-10 sm:w-20 h-[3px] transition-all duration-500 rounded-full mb-6 ${currentStep > idx ? "bg-primary" : "bg-muted-foreground/20"}`} />}
                     </React.Fragment>
                   );
                })}
            </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden relative bg-muted/10">
            <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                <AnimatePresence mode="wait" initial={false}>
                  {currentStep === 0 && (
                    <motion.div key="step0" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="max-w-xl mx-auto space-y-8 pb-10">
                      
                      <div className="space-y-6 bg-card p-6 rounded-2xl border shadow-sm">
                          <h3 className="text-lg font-headline font-bold flex items-center gap-2 border-b pb-3"><MapPin className="h-5 w-5 text-primary" /> Delivery Options</h3>
                          <FormField name="isDiasporaGift" control={form.control} render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 rounded-xl border p-4 bg-muted/10 transition-colors hover:bg-muted/20">
                              <FormControl><Checkbox className="h-5 w-5 rounded-sm" checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="cursor-pointer font-semibold text-base">This is a gift for someone in Zimbabwe</FormLabel>
                                <FormDescription>We&apos;ll notify the recipient on your behalf.</FormDescription>
                              </div>
                            </FormItem>
                          )} />

                          {isDiasporaGift ? (
                            <div className="space-y-5 animate-fade-in-up">
                              <FormField name="recipientName" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Recipient&apos;s Name</FormLabel><FormControl><Input className="h-12 bg-background" placeholder="Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>
                              )} />
                              <FormField name="recipientPhone" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Recipient&apos;s Phone</FormLabel><FormControl><Input className="h-12 bg-background" placeholder="+263 7..." {...field} /></FormControl><FormMessage /></FormItem>
                              )} />
                              <div className="grid grid-cols-2 gap-4">
                                <FormField name="customerName" control={form.control} render={({ field }) => (<FormItem><FormLabel>Your Name</FormLabel><FormControl><Input className="h-12 bg-background" placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField name="customerPhone" control={form.control} render={({ field }) => (<FormItem><FormLabel>Your Phone</FormLabel><FormControl><Input className="h-12 bg-background" placeholder="+263 7..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                              </div>
                              <FormField name="customerEmail" control={form.control} render={({ field }) => (<FormItem><FormLabel>Your Email</FormLabel><FormControl><Input className="h-12 bg-background" placeholder="me@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                          ) : (
                            <div className="space-y-5 animate-fade-in-up">
                              <FormField name="deliveryMethod" control={form.control} render={({ field }) => (
                                <FormItem>
                                  <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4 pt-2">
                                    <FormItem>
                                      <FormControl><RadioGroupItem value="collect" className="peer sr-only" /></FormControl>
                                      <FormLabel className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-background p-5 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all cursor-pointer">
                                        <span className="text-base font-bold">Self Collection</span>
                                        <span className="text-xs text-muted-foreground mt-1">Free of charge</span>
                                      </FormLabel>
                                    </FormItem>
                                    <FormItem>
                                      <FormControl><RadioGroupItem value="delivery" className="peer sr-only" /></FormControl>
                                      <FormLabel className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-background p-5 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all cursor-pointer">
                                        <span className="text-base font-bold">Biker Delivery</span>
                                        <span className="text-xs text-muted-foreground mt-1">Zone-based quote</span>
                                      </FormLabel>
                                    </FormItem>
                                  </RadioGroup><FormMessage />
                                </FormItem>
                              )} />
                              
                              <div className="space-y-5 animate-fade-in-up pt-2">
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField name="customerName" control={form.control} render={({ field }) => (<FormItem><FormLabel>Your Name</FormLabel><FormControl><Input className="h-12 bg-background" placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                  <FormField name="customerPhone" control={form.control} render={({ field }) => (<FormItem><FormLabel>Your Phone</FormLabel><FormControl><Input className="h-12 bg-background" placeholder="+263 7..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <FormField name="customerEmail" control={form.control} render={({ field }) => (<FormItem><FormLabel>Your Email</FormLabel><FormControl><Input className="h-12 bg-background" placeholder="me@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                
                                {profileHydrated && (
                                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-primary flex items-center gap-2 font-medium">
                                    <CheckCircle2 className="h-4 w-4" /> Returning customer profile found. Details auto-filled.
                                  </div>
                                )}

                                {deliveryMethod === "delivery" && (
                                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-5 p-4 bg-muted/20 border rounded-xl">
                                    {savedAddresses.length > 0 && (
                                      <FormItem>
                                        <FormLabel>Use Saved Address</FormLabel>
                                        <Select
                                          onValueChange={(value) => {
                                            const selected = savedAddresses.find(address => address.address === value);
                                            if (!selected) return;
                                            form.setValue("customerAddress", selected.address, { shouldDirty: true, shouldValidate: true });
                                            form.setValue("deliveryInstructions", selected.instructions ?? "", { shouldDirty: true });
                                          }}
                                        >
                                          <FormControl>
                                            <SelectTrigger className="h-12 bg-background">
                                              <SelectValue placeholder="Choose a saved delivery address" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {savedAddresses.map(address => (
                                              <SelectItem key={address.address} value={address.address}>
                                                {address.label ? `${address.label} - ` : ""}{address.address}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </FormItem>
                                    )}
                                    <FormField
                                      name="deliveryZoneId"
                                      control={form.control}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Delivery Zone</FormLabel>
                                          <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                              <SelectTrigger className="h-12 bg-background">
                                                <SelectValue placeholder="Choose a delivery zone" />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              {deliveryZones.map(zone => (
                                                <SelectItem key={zone.id} value={zone.id}>
                                                  {zone.name} • {formatMoney(convertFromUsd(zone.baseFeeUsd, state.currencyCode), state.currencyCode)}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField name="customerAddress" control={form.control} render={({ field }) => (<FormItem><FormLabel>Delivery Address</FormLabel><FormControl><Input className="h-12 bg-background" placeholder="123 Main St, Harare" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField name="deliveryInstructions" control={form.control} render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Delivery Instructions</FormLabel>
                                        <FormControl><Textarea className="bg-background" placeholder="Gate code, landmark, unit number, or preferred handover notes." rows={3} {...field} /></FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )} />
                                  </motion.div>
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="max-w-xl mx-auto space-y-6 pb-10">
                      
                      <div className="bg-card p-6 rounded-2xl border shadow-sm">
                          <h3 className="text-lg font-headline font-bold flex items-center gap-2 border-b pb-3 mb-5"><CreditCard className="h-5 w-5 text-primary" /> Payment Method</h3>
                          <FormField name="paymentMethod" control={form.control} render={({ field }) => (
                            <FormItem>
                              <RadioGroup onValueChange={(val) => { field.onChange(val); setAwaitingOtp(false); }} defaultValue={field.value} className="grid grid-cols-2 gap-3">
                                {enabledPaymentMethodOptions.map((m) => (
                                  <FormItem key={m.id}>
                                    <FormControl><RadioGroupItem value={m.id} className="peer sr-only" /></FormControl>
                                    <FormLabel className="flex flex-col items-center justify-center h-20 rounded-xl border-2 border-muted bg-background p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all text-sm font-bold cursor-pointer">
                                      {m.label}
                                    </FormLabel>
                                  </FormItem>
                                ))}
                              </RadioGroup>
                              <FormMessage />
                            </FormItem>
                          )} />

                          {requiresMobileNumber(paymentMethod) && (
                            <FormField name="customerMobile" control={form.control} render={({ field }) => (
                              <FormItem className="animate-fade-in-up mt-6">
                                <FormLabel>{getPaymentMethodLabel(paymentMethod)} Mobile Number</FormLabel>
                                <FormControl><Input className="h-12 bg-background text-lg" placeholder="+263 7..." {...field} /></FormControl>
                                <FormDescription>{getPaymentMethodMobileHint(paymentMethod)}</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )} />
                          )}

                          {awaitingOtp && (
                            <FormField name="otp" control={form.control} render={({ field }) => (
                              <FormItem className="animate-fade-in-up mt-6 p-5 bg-muted/30 border rounded-xl">
                                <FormLabel className="text-lg text-primary flex items-center gap-2"><CheckCircle2 className="h-5 w-5"/> Enter OTP to Confirm</FormLabel>
                                <FormControl><Input className="h-14 text-center tracking-widest text-2xl font-bold bg-background shadow-inner" placeholder="0000" {...field} /></FormControl>
                                <FormMessage />
                                <FormDescription className="text-center mt-2">Verify the payment with the code sent to your mobile.</FormDescription>
                              </FormItem>
                            )} />
                          )}
                      </div>

                      <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-2xl border border-primary/20 shadow-sm">
                        <h4 className="font-semibold mb-4 text-foreground/80">Order Summary</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between text-base font-medium"><span>Subtotal ({state.items.reduce((s, i) => s + i.quantity, 0)} items)</span><span>{formatMoney(subtotal, state.currencyCode)}</span></div>
                            {deliveryMethod === "delivery" && (
                              <div className="flex justify-between text-base font-medium italic text-muted-foreground">
                                <span>Delivery {!deliveryQuote && "(Waiting)"}</span>
                                <span>{deliveryQuote ? formatMoney(deliveryQuote.fee, state.currencyCode) : "..."}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-2xl font-headline font-bold pt-4 border-t border-primary/20"><p>Total</p><p className="text-primary">{formatMoney(total, state.currencyCode)}</p></div>
                        </div>
                      </div>

                    </motion.div>
                  )}

                  {currentStep === 2 && (
                    <motion.div key="step3" initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="max-w-md mx-auto py-4">
                        <div className="bg-white dark:bg-card rounded-2xl overflow-hidden shadow-2xl border border-muted/50 relative">
                            {/* Receipt Header styling */}
                            <div className="bg-primary/5 p-8 text-center border-b border-dashed border-primary/20">
                                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 ring-8 ring-primary/5">
                                    <CheckCircle2 className="h-8 w-8 text-primary" />
                                </div>
                                <h2 className="font-headline text-3xl font-bold text-foreground">Order Confirmed!</h2>
                                <p className="text-muted-foreground mt-2 font-medium">Thank you for your purchase.</p>
                                <div className="mt-6 py-3 bg-white dark:bg-background rounded-lg border flex flex-col">
                                    <span className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Order Number</span>
                                    <span className="font-mono text-xl font-bold tracking-wider">{lastOrderReference || "N/A"}</span>
                                </div>
                            </div>

                            {/* Receipt Body */}
                            <div className="p-8">
                                <h4 className="border-b pb-2 mb-4 font-bold text-sm tracking-widest text-muted-foreground uppercase">Items Summary</h4>
                                <div className="space-y-4 mb-8">
                                    {receiptItemsSnapshot.map(item => (
                                        <div key={item.id} className="flex justify-between items-start text-sm">
                                            <span className="font-medium pr-4">{item.quantity}x {item.name}</span>
                                            <span className="font-semibold">{formatMoney(convertFromUsd(item.price * item.quantity, state.currencyCode), state.currencyCode)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-4 border-t-2 border-dashed flex justify-between items-center bg-muted/10 -mx-8 px-8 pb-4">
                                    <span className="font-bold text-lg">Total Paid</span>
                                    <span className="text-2xl font-bold text-primary">{formatMoney(total, state.currencyCode)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 space-y-4">
                            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex gap-4 items-start">
                                <Camera className="w-6 h-6 text-primary shrink-0" />
                                <p className="text-sm font-medium text-foreground">Please take a screenshot of this receipt or download it below. You will need your Order Number for collection or delivery tracking.</p>
                            </div>
                            
                            {lastOrderReference && (
                                <Button asChild size="lg" className="w-full text-lg h-14 rounded-xl shadow-xl transition-all hover:scale-[1.02]">
                                    <a href={`/api/orders/${encodeURIComponent(lastOrderReference)}/report?format=pdf`} target="_blank" rel="noreferrer">
                                        <Download className="mr-2 h-6 w-6" />
                                        Download PDF Receipt
                                    </a>
                                </Button>
                            )}
                        </div>

                    </motion.div>
                  )}
                </AnimatePresence>
            </div>

            {/* Bottom Sticky Action Bar */}
            {currentStep < 2 && (
                <div className="bg-background px-6 pt-5 pb-6 border-t shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] relative z-10 flex items-center justify-between">
                  {currentStep === 1 && (
                      <Button type="button" variant="ghost" className="text-muted-foreground font-semibold" onClick={() => setCurrentStep(0)}>
                          <ChevronLeft className="w-4 h-4 mr-1" /> Back
                      </Button>
                  )}
                  {currentStep === 0 && <span/>}
                  
                  {currentStep === 0 && (
                      <Button type="button" size="lg" onClick={handleNextStep} className="font-bold px-8 shadow-md rounded-full">
                          Continue to Payment <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                  )}
                  {currentStep === 1 && (
                      <Button type="submit" size="lg" disabled={isSubmitting} className="font-bold px-10 shadow-lg rounded-full h-12 w-full sm:w-auto mt-0">
                          {isSubmitting ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />Processing...</>) : (
                             awaitingOtp ? "Verify Payment" : (paymentMethod === "CARD" ? "Proceed to Secure Pay" : `Pay ${formatMoney(total, state.currencyCode)}`)
                          )}
                      </Button>
                  )}
                </div>
            )}
            
            {/* Close button for Receipt Step */}
            {currentStep === 2 && (
                <div className="bg-background px-6 pt-4 pb-6 border-t relative z-10">
                    <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)} className="w-full font-bold h-12 rounded-xl">
                        Done
                    </Button>
                </div>
            )}

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
"""

patched = prefix + new_jsx
with open("src/components/pages/store/checkout-dialog.tsx", "w") as f:
    f.write(patched)

print("Done replacing.")
