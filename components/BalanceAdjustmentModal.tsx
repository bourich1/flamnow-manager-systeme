'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { supabase, BalanceAdjustment } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Minus, Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function BalanceAdjustmentModal({ open, onOpenChange, onSuccess }: Props) {
  const [adjustments, setAdjustments] = useState<BalanceAdjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease'>('increase');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadAdjustments();
    }
  }, [open]);

  const loadAdjustments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('balance_adjustments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load adjustments',
        variant: 'destructive',
      });
    } else {
      setAdjustments(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid positive number',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const finalAmount = adjustmentType === 'decrease' ? -numAmount : numAmount;

    if (editingId) {
      const { error } = await supabase
        .from('balance_adjustments')
        .update({ amount: finalAmount, reason })
        .eq('id', editingId);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update adjustment',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Adjustment updated successfully',
        });
        setEditingId(null);
        resetForm();
        loadAdjustments();
        onSuccess();
      }
    } else {
      const { error } = await supabase
        .from('balance_adjustments')
        .insert([{ user_id: user.id, amount: finalAmount, reason }]);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to add adjustment',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Adjustment added successfully',
        });
        resetForm();
        loadAdjustments();
        onSuccess();
      }
    }

    setLoading(false);
  };

  const handleEdit = (adjustment: BalanceAdjustment) => {
    setEditingId(adjustment.id);
    setAmount(Math.abs(adjustment.amount).toString());
    setReason(adjustment.reason);
    setAdjustmentType(adjustment.amount >= 0 ? 'increase' : 'decrease');
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from('balance_adjustments')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete adjustment',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Adjustment deleted successfully',
      });
      loadAdjustments();
      onSuccess();
    }

    setDeleteId(null);
  };

  const resetForm = () => {
    setAmount('');
    setReason('');
    setAdjustmentType('increase');
    setEditingId(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Company Balance Adjustments</DialogTitle>
            <DialogDescription>
              Add, edit, or view balance adjustments with reasons
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="new" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new">New Adjustment</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Adjustment Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={adjustmentType === 'increase' ? 'default' : 'outline'}
                      className={adjustmentType === 'increase' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                      onClick={() => setAdjustmentType('increase')}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Increase
                    </Button>
                    <Button
                      type="button"
                      variant={adjustmentType === 'decrease' ? 'default' : 'outline'}
                      className={adjustmentType === 'decrease' ? 'bg-red-600 hover:bg-red-700' : ''}
                      onClick={() => setAdjustmentType('decrease')}
                    >
                      <Minus className="mr-2 h-4 w-4" />
                      Decrease
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (MAD)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    placeholder="Explain why the balance is being adjusted..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    disabled={loading}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingId ? 'Updating...' : 'Adding...'}
                      </>
                    ) : (
                      editingId ? 'Update Adjustment' : 'Add Adjustment'
                    )}
                  </Button>
                  {editingId && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </form>
            </TabsContent>

            <TabsContent value="history" className="space-y-3">
              {adjustments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No adjustments yet
                </p>
              ) : (
                adjustments.map((adjustment) => (
                  <Card key={adjustment.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            {adjustment.amount >= 0 ? (
                              <TrendingUp className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <TrendingDown className="h-5 w-5 text-red-600" />
                            )}
                            <span className={`text-xl font-semibold ${
                              adjustment.amount >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              {adjustment.amount >= 0 ? '+' : ''}{adjustment.amount.toFixed(2)} MAD
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{adjustment.reason}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(adjustment.created_at), 'PPp')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(adjustment)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteId(adjustment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Adjustment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this adjustment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
