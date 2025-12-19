'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase, Client } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  client?: Client | null;
};

export function ClientFormModal({ open, onOpenChange, onSuccess, client }: Props) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [subscriptionType, setSubscriptionType] = useState<'monthly' | 'one-time'>('one-time');
  const [startDate, setStartDate] = useState('');
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (client) {
      setName(client.name);
      setTotalAmount(client.total_amount.toString());
      setPaidAmount(client.paid_amount.toString());
      setSubscriptionType(client.subscription_type);
      setStartDate(client.start_date || '');
      setNextPaymentDate(client.next_payment_date || '');
    } else {
      resetForm();
    }
  }, [client, open]);

  const resetForm = () => {
    setName('');
    setTotalAmount('');
    setPaidAmount('0');
    setSubscriptionType('one-time');
    setStartDate('');
    setNextPaymentDate('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const total = parseFloat(totalAmount);
    const paid = parseFloat(paidAmount);

    if (isNaN(total) || total < 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid total amount',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (isNaN(paid) || paid < 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid paid amount',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (paid > total) {
      toast({
        title: 'Invalid Amount',
        description: 'Paid amount cannot exceed total amount',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const clientData = {
      name,
      total_amount: total,
      paid_amount: paid,
      subscription_type: subscriptionType,
      start_date: subscriptionType === 'monthly' && startDate ? startDate : null,
      next_payment_date: subscriptionType === 'monthly' && nextPaymentDate ? nextPaymentDate : null,
      user_id: user.id,
    };

    if (client) {
      const oldPaidAmount = client.paid_amount;
      const newPaidAmount = paid;
      const paymentDifference = newPaidAmount - oldPaidAmount;

      const { error } = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', client.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update client',
          variant: 'destructive',
        });
      } else {
        if (paymentDifference > 0) {
          const transactionData = {
            user_id: user.id,
            client_id: client.id,
            client_name: name,
            amount: paymentDifference,
            payment_date: new Date().toISOString(),
          };

          const { error: transactionError } = await supabase
            .from('payment_transactions')
            .insert([transactionData]);

          if (transactionError) {
            console.error('Failed to create transaction:', transactionError);
          }
        }

        toast({
          title: 'Success',
          description: 'Client updated successfully',
        });
        onOpenChange(false);
        onSuccess();
      }
    } else {
      const { data: newClient, error } = await supabase
        .from('clients')
        .insert([clientData])
        .select()
        .single();

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to add client',
          variant: 'destructive',
        });
      } else {
        if (paid > 0 && newClient) {
          const transactionData = {
            user_id: user.id,
            client_id: newClient.id,
            client_name: name,
            amount: paid,
            payment_date: new Date().toISOString(),
          };

          const { error: transactionError } = await supabase
            .from('payment_transactions')
            .insert([transactionData]);

          if (transactionError) {
            console.error('Failed to create transaction:', transactionError);
          }
        }

        toast({
          title: 'Success',
          description: 'Client added successfully',
        });
        onOpenChange(false);
        onSuccess();
      }
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{client ? 'Edit Client' : 'Add New Client'}</DialogTitle>
          <DialogDescription>
            {client ? 'Update client information' : 'Enter client details to add them to your system'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Client Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalAmount">Total Amount (MAD)</Label>
            <Input
              id="totalAmount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidAmount">Paid Amount (MAD)</Label>
            <Input
              id="paidAmount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subscriptionType">Subscription Type</Label>
            <Select
              value={subscriptionType}
              onValueChange={(value: 'monthly' | 'one-time') => setSubscriptionType(value)}
              disabled={loading}
            >
              <SelectTrigger id="subscriptionType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one-time">One-Time</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {subscriptionType === 'monthly' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nextPaymentDate">Next Payment Date</Label>
                <Input
                  id="nextPaymentDate"
                  type="date"
                  value={nextPaymentDate}
                  onChange={(e) => setNextPaymentDate(e.target.value)}
                  disabled={loading}
                />
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {client ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                client ? 'Update Client' : 'Add Client'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
