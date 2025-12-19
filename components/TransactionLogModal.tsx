'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { supabase, PaymentTransaction } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Receipt, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TransactionLogModal({ open, onOpenChange }: Props) {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadTransactions();
    }
  }, [open]);

  const loadTransactions = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('payment_date', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load transactions',
        variant: 'destructive',
      });
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment Transaction Log
          </DialogTitle>
          <DialogDescription>
            Complete history of all payment transactions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Transactions will appear here when clients make payments
              </p>
            </div>
          ) : (
            <>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-900">Total Transactions</p>
                    <p className="text-2xl font-bold text-emerald-700">{transactions.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-emerald-900">Total Amount</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {transactions.reduce((sum, t) => sum + Number(t.amount), 0).toFixed(2)} MAD
                    </p>
                  </div>
                </div>
              </div>

              {transactions.map((transaction) => (
                <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="bg-emerald-100 p-2 rounded-lg">
                          <DollarSign className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{transaction.client_name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(transaction.payment_date), 'PPP')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Recorded: {format(new Date(transaction.created_at), 'PPp')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-600">
                          {Number(transaction.amount).toFixed(2)} MAD
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
