'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Client, BalanceAdjustment, PaymentTransaction } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Plus,
  LogOut,
  Pencil,
  Trash2,
  Calendar,
  Wallet,
  FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BalanceAdjustmentModal } from '@/components/BalanceAdjustmentModal';
import { ClientFormModal } from '@/components/ClientFormModal';
import { TransactionLogModal } from '@/components/TransactionLogModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}

function Dashboard() {
  const { user, signOut } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [adjustments, setAdjustments] = useState<BalanceAdjustment[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [transactionLogOpen, setTransactionLogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadClients(), loadAdjustments(), loadTransactions()]);
    setLoading(false);
  };

  const loadClients = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load clients',
        variant: 'destructive',
      });
    } else {
      setClients(data || []);
    }
  };

  const loadAdjustments = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('balance_adjustments')
      .select('*')
      .eq('user_id', user.id);

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

  const loadTransactions = async () => {
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
  };

  const handleDeleteClient = async () => {
    if (!deleteClientId) return;

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', deleteClientId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete client',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Client deleted successfully',
      });
      loadClients();
    }

    setDeleteClientId(null);
  };

  const handleLogout = async () => {
    await signOut();
    setLogoutConfirm(false);
  };

  const totalRevenue = clients.reduce((sum, client) => sum + Number(client.total_amount), 0);
  const totalPaid = clients.reduce((sum, client) => sum + Number(client.paid_amount), 0);
  const totalRemaining = totalRevenue - totalPaid;
  const totalAdjustments = adjustments.reduce((sum, adj) => sum + Number(adj.amount), 0);
  const companyBalance = totalPaid + totalAdjustments;

  const generatePDF = async (user: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const currentDate = format(new Date(), 'PPP');

     const logoUrl = '/flamnow-logo.png';
  const image = await fetch(logoUrl)
    .then(res => res.blob())
    .then(blob => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject('Failed to read image as Base64');
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    }));

  // إضافة الصورة
  doc.addImage(image, 'PNG', 90, 5, 30, 15);


    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Money Management Report', pageWidth / 2, 40, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on ${currentDate}`, pageWidth / 2, 48, { align: 'center' });
    doc.text(`User: ${user?.email || 'CO-FOUNDERS'}`, pageWidth / 2, 54, { align: 'center' });



    const summaryData = [
      ['Total Revenue', `${totalRevenue.toFixed(2)} MAD`],
      ['Total Paid', `${totalPaid.toFixed(2)} MAD`],
      ['Remaining Amount', `${totalRemaining.toFixed(2)} MAD`],
      ['Company Balance', `${companyBalance.toFixed(2)} MAD`],
      ['Number of Clients', `${clients.length}`]
    ];

    autoTable(doc, {
      startY: 80,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: {
        fillColor: [237, 63, 39],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 11
      },
      bodyStyles: {
        fontSize: 10
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 100 },
        1: { halign: 'right', cellWidth: 80 }
      },
      margin: { left: 14, right: 14 }
    });

    let finalY = (doc as any).lastAutoTable.finalY || 120;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Company Balance Adjustments', 14, finalY + 15);

    if (adjustments.length > 0) {
      const adjustmentData = adjustments.map((adj, index) => [
        (index + 1).toString(),
        adj.reason || 'N/A',
        `${Number(adj.amount).toFixed(2)} MAD`,
        format(new Date(adj.created_at), 'PP')
      ]);

      autoTable(doc, {
        startY: finalY + 20,
        head: [['#', 'Reason', 'Amount', 'Date']],
        body: adjustmentData,
        theme: 'striped',
        headStyles: {
          fillColor: [237, 63, 39],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 70 },
          2: { cellWidth: 40, halign: 'right' },
          3: { cellWidth: 50, halign: 'center' }
        },
        margin: { left: 14, right: 14 }
      });
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('No adjustments found', 14, finalY + 25);
    }

    finalY = (doc as any).lastAutoTable.finalY || finalY + 40;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Client List', 14, finalY + 15);

    if (clients.length > 0) {
      const clientData = clients.map((client, index) => [
        (index + 1).toString(),
        client.name,
        client.subscription_type === 'monthly' ? 'Monthly' : 'One-Time',
        `${Number(client.total_amount).toFixed(2)} MAD`,
        `${Number(client.paid_amount).toFixed(2)} MAD`
      ]);

      autoTable(doc, {
        startY: finalY + 20,
        head: [['#', 'Client Name', 'Type', 'Total Amount', 'Paid Amount']],
        body: clientData,
        theme: 'striped',
        headStyles: {
          fillColor: [237, 63, 39],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 60 },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 40, halign: 'right' },
          4: { cellWidth: 40, halign: 'right' }
        },
        margin: { left: 14, right: 14 }
      });
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('No clients found', 14, finalY + 25);
    }

    finalY = (doc as any).lastAutoTable.finalY || finalY + 40;

    doc.addPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Transaction Log', 14, 20);

    if (transactions.length > 0) {
      const transactionData = transactions.map((transaction, index) => [
        (index + 1).toString(),
        transaction.client_name,
        `${Number(transaction.amount).toFixed(2)} MAD`,
        format(new Date(transaction.payment_date), 'PP')
      ]);

      autoTable(doc, {
        startY: 25,
        head: [['#', 'Client Name', 'Amount Paid', 'Payment Date']],
        body: transactionData,
        theme: 'striped',
        headStyles: {
          fillColor: [237, 63, 39],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 80 },
          2: { cellWidth: 50, halign: 'right' },
          3: { cellWidth: 50, halign: 'center' }
        },
        margin: { left: 14, right: 14 }
      });

      const totalTransactionAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
      finalY = (doc as any).lastAutoTable.finalY || 100;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Transactions: ${transactions.length}`, 14, finalY + 10);
      doc.text(`Total Amount: ${totalTransactionAmount.toFixed(2)} MAD`, 14, finalY + 18);
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('No payment transactions found', 14, 30);
    }

    const fileName = `money-management-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);

    toast({
      title: 'Success',
      description: 'PDF report generated successfully',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <Wallet className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Money Management</h1>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>
          </div>
          <div className="flex  flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={generatePDF}
              className="gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
            >
              <FileText className="h-4 w-4" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => setLogoutConfirm(true)}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-50">
                Total Revenue
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-emerald-50" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalRevenue.toFixed(2)} MAD</div>
              <p className="text-xs text-emerald-50 mt-1">From all clients</p>
            </CardContent>
          </Card>

          <Card
            className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105"
            onClick={() => setTransactionLogOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-50">
                Total Paid
              </CardTitle>
              <DollarSign className="h-5 w-5 text-blue-50" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalPaid.toFixed(2)} MAD</div>
              <p className="text-xs text-blue-50 mt-1">Click to view transaction log</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-50">
                Remaining
              </CardTitle>
              <TrendingDown className="h-5 w-5 text-amber-50" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalRemaining.toFixed(2)} MAD</div>
              <p className="text-xs text-amber-50 mt-1">Still to be paid</p>
            </CardContent>
          </Card>

          <Card
            className="bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105"
            onClick={() => setBalanceModalOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-50">
                Company Balance
              </CardTitle>
              <Wallet className="h-5 w-5 text-slate-50" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{companyBalance.toFixed(2)} MAD</div>
              <p className="text-xs text-slate-50 mt-1">Click to adjust</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-gray-700" />
            <h2 className="text-2xl font-bold text-gray-900">Clients</h2>
            <Badge variant="secondary" className="text-base">
              {clients.length}
            </Badge>
          </div>
          <Button
            onClick={() => {
              setEditingClient(null);
              setClientModalOpen(true);
            }}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        </div>

        {clients.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No clients yet</h3>
            <p className="text-gray-500 mb-6">Start by adding your first client</p>
            <Button
              onClick={() => {
                setEditingClient(null);
                setClientModalOpen(true);
              }}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => {
              const remaining = Number(client.total_amount) - Number(client.paid_amount);
              const percentPaid = (Number(client.paid_amount) / Number(client.total_amount)) * 100;

              return (
                <Card key={client.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{client.name}</CardTitle>
                        <Badge variant={client.subscription_type === 'monthly' ? 'default' : 'secondary'}>
                          {client.subscription_type === 'monthly' ? 'Monthly' : 'One-Time'}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingClient(client);
                            setClientModalOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteClientId(client.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-semibold">{Number(client.total_amount).toFixed(2)} MAD</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Paid:</span>
                        <span className="font-semibold text-emerald-600">{Number(client.paid_amount).toFixed(2)} MAD</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Remaining:</span>
                        <span className="font-semibold text-amber-600">{remaining.toFixed(2)} MAD</span>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-emerald-600 h-2.5 rounded-full transition-all"
                        style={{ width: `${Math.min(percentPaid, 100)}%` }}
                      ></div>
                    </div>

                    {client.subscription_type === 'monthly' && (
                      <div className="pt-2 border-t space-y-1">
                        {client.start_date && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Calendar className="h-3 w-3" />
                            <span>Started: {format(new Date(client.start_date), 'PP')}</span>
                          </div>
                        )}
                        {client.next_payment_date && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Calendar className="h-3 w-3" />
                            <span>Next: {format(new Date(client.next_payment_date), 'PP')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <BalanceAdjustmentModal
        open={balanceModalOpen}
        onOpenChange={setBalanceModalOpen}
        onSuccess={loadAdjustments}
      />

      <ClientFormModal
        open={clientModalOpen}
        onOpenChange={setClientModalOpen}
        onSuccess={loadClients}
        client={editingClient}
      />

      <TransactionLogModal
        open={transactionLogOpen}
        onOpenChange={setTransactionLogOpen}
      />

      <AlertDialog open={!!deleteClientId} onOpenChange={() => setDeleteClientId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this client? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={logoutConfirm} onOpenChange={setLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-emerald-600 hover:bg-emerald-700">
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
