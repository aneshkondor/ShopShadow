import { useState } from 'react';
import { motion } from 'motion/react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowLeft, CreditCard, Apple, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface BasketItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface CheckoutPageProps {
  items: BasketItem[];
  total: number;
  onBack: () => void;
  onComplete: () => void;
}

export function CheckoutPage({ items, total, onBack, onComplete }: CheckoutPageProps) {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  const handleCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsComplete(true);
      toast.success('Payment successful!', {
        duration: 3000,
        position: 'bottom-right',
        style: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(52, 211, 153, 0.3)',
          color: '#1e293b',
        },
      });

      // Redirect after success animation
      setTimeout(() => {
        onComplete();
      }, 2000);
    }, 2000);
  };

  const handleApplePayment = () => {
    setIsProcessing(true);
    
    // Simulate Apple Pay processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsComplete(true);
      toast.success('Payment successful!', {
        duration: 3000,
        position: 'bottom-right',
        style: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(52, 211, 153, 0.3)',
          color: '#1e293b',
        },
      });

      setTimeout(() => {
        onComplete();
      }, 2000);
    }, 2000);
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.replace(/(\d{4})/g, '$1 ').trim();
    return formatted.slice(0, 19); // 16 digits + 3 spaces
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="flex justify-center"
          >
            <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-600" />
            </div>
          </motion.div>
          <div>
            <h2 className="text-slate-900">Payment Complete!</h2>
            <p className="text-slate-600 mt-2">Thank you for your purchase</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 pb-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-6"
      >
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Basket
        </button>

        {/* Order Summary */}
        <GlassCard className="p-6">
          <h2 className="text-slate-900 mb-4">Order Summary</h2>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-slate-600">
                  {item.name} × {item.quantity}
                </span>
                <span className="text-slate-900">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="pt-3 border-t border-slate-300/50 flex justify-between">
              <span className="text-slate-900">Total</span>
              <span className="text-slate-900 text-xl">${total.toFixed(2)}</span>
            </div>
          </div>
        </GlassCard>

        {/* Payment Method Selection */}
        <GlassCard className="p-6">
          <h2 className="text-slate-900 mb-4">Payment Method</h2>
          <div className="space-y-3">
            <button
              onClick={() => setPaymentMethod('card')}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'card'
                  ? 'border-slate-800 bg-slate-800/5'
                  : 'border-slate-300/50 hover:border-slate-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-slate-700" />
                <span className="text-slate-900">Credit / Debit Card</span>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod('apple')}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'apple'
                  ? 'border-slate-800 bg-slate-800/5'
                  : 'border-slate-300/50 hover:border-slate-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <Apple className="w-6 h-6 text-slate-700" />
                <span className="text-slate-900">Apple Pay</span>
              </div>
            </button>
          </div>
        </GlassCard>

        {/* Card Payment Form */}
        {paymentMethod === 'card' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <GlassCard className="p-6">
              <h3 className="text-slate-900 mb-4">Card Details</h3>
              <form onSubmit={handleCardPayment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cardNumber" className="text-slate-700">Card Number</Label>
                  <Input
                    id="cardNumber"
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    required
                    className="bg-white/50 border-slate-300/50 text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardName" className="text-slate-700">Cardholder Name</Label>
                  <Input
                    id="cardName"
                    type="text"
                    placeholder="John Doe"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    required
                    className="bg-white/50 border-slate-300/50 text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiry" className="text-slate-700">Expiry Date</Label>
                    <Input
                      id="expiry"
                      type="text"
                      placeholder="MM/YY"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                      required
                      maxLength={5}
                      className="bg-white/50 border-slate-300/50 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv" className="text-slate-700">CVV</Label>
                    <Input
                      id="cvv"
                      type="text"
                      placeholder="123"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      required
                      maxLength={3}
                      className="bg-white/50 border-slate-300/50 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <GlassButton
                  variant="primary"
                  type="submit"
                  disabled={isProcessing}
                  className="w-full text-white py-4"
                >
                  {isProcessing ? 'Processing...' : `Pay $${total.toFixed(2)}`}
                </GlassButton>
              </form>
            </GlassCard>
          </motion.div>
        )}

        {/* Apple Pay Button */}
        {paymentMethod === 'apple' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <GlassButton
              variant="primary"
              onClick={handleApplePayment}
              disabled={isProcessing}
              className="w-full text-white py-6 flex items-center justify-center gap-2"
            >
              <Apple className="w-6 h-6" />
              {isProcessing ? 'Processing...' : `Pay $${total.toFixed(2)} with Apple Pay`}
            </GlassButton>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
