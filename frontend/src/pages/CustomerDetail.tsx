import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Customer, Transaction, Subscription, CustomerDetailData } from "@/types";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building, Mail, Phone, Globe, MapPin, Calendar, Edit, ArrowLeft, Receipt, AlertCircle, CreditCard } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [subscriptionsError, setSubscriptionsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomerDetail = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      setTransactionsLoading(true);
      setSubscriptionsLoading(true);
      
      try {
        // Intentar obtener todos los datos del cliente en una sola llamada
        const response = await api.getCustomerDetailById(id);
        
        if (response.success && response.data) {
          // Asegurarse de que customer existe
          if (response.data.customer) {
            setCustomer(response.data.customer);
          } else {
            console.warn("La respuesta detallada no incluye datos del cliente");
            // Intentar obtener los datos básicos del cliente
            fetchBasicCustomer();
            return; // Salir para evitar procesamiento adicional
          }
          
          // Manejar transacciones
          if (response.data.transactions) {
            setTransactions(response.data.transactions);
            setTransactionsLoading(false);
          } else {
            console.info("La respuesta detallada no incluye transacciones, cargando por separado");
            // Si no hay transacciones en la respuesta detallada, cargarlas por separado
            fetchTransactions();
          }
          
          // Manejar suscripciones
          if (response.data.subscriptions) {
            setSubscriptions(response.data.subscriptions);
            setSubscriptionsLoading(false);
          } else {
            console.info("La respuesta detallada no incluye suscripciones, cargando por separado");
            // Si no hay suscripciones en la respuesta detallada, cargarlas por separado
            fetchSubscriptions();
          }
        } else {
          console.warn("La llamada detallada falló, intentando obtener datos básicos", response.error);
          // Si falla la llamada detallada, intentar obtener solo los datos básicos del cliente
          const basicResponse = await api.getCustomerById(id);
          
          if (basicResponse.success && basicResponse.data) {
            setCustomer(basicResponse.data);
            // Cargar transacciones y suscripciones por separado
            fetchTransactions();
            fetchSubscriptions();
          } else {
            setError(basicResponse.error || "No se pudo cargar la información del cliente");
          }
        }
      } catch (err) {
        console.error("Error fetching customer details:", err);
        setError("Error al conectar con el servidor");
        // Intentar cargar los datos básicos del cliente
        fetchBasicCustomer();
      } finally {
        setLoading(false);
      }
    };
    
    const fetchBasicCustomer = async () => {
      try {
        if (!id) {
          setError("ID de cliente no disponible");
          return;
        }
        
        const response = await api.getCustomerById(id);
        
        if (response.success) {
          // Asegurarse de que hay datos, incluso si están vacíos
          if (response.data) {
            setCustomer(response.data);
          } else {
            console.warn("La respuesta básica no incluye datos del cliente");
            setError("No se encontraron datos del cliente");
            return;
          }
          
          // Cargar transacciones y suscripciones por separado
          fetchTransactions();
          fetchSubscriptions();
        } else {
          console.error("Error en respuesta básica:", response.error);
          setError(response.error || "No se pudo cargar la información del cliente");
        }
      } catch (err) {
        console.error("Error fetching basic customer:", err);
        setError("Error al conectar con el servidor");
      } finally {
        setLoading(false);
      }
    };
    
    fetchCustomerDetail();
  }, [id]);

  const fetchTransactions = async () => {
    if (!id) return;
    
    setTransactionsLoading(true);
    setTransactionsError(null);
    
    try {
      const response = await api.getCustomerTransactions(id);
      
      if (response.success) {
        // Asegurarse de que siempre haya un array, incluso si data es null o undefined
        setTransactions(response.data || []);
        
        // Si hay un mensaje pero no hay transacciones, mostrarlo como información, no como error
        if (response.message && (!response.data || response.data.length === 0)) {
          console.info("Mensaje sobre transacciones:", response.message);
        }
      } else {
        setTransactionsError(response.error || "No se pudieron cargar las transacciones");
      }
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setTransactionsError("Error al conectar con el servidor");
    } finally {
      setTransactionsLoading(false);
    }
  };
  
  const fetchSubscriptions = async () => {
    if (!id) return;
    
    setSubscriptionsLoading(true);
    setSubscriptionsError(null);
    
    try {
      const response = await api.getCustomerSubscriptions(id);
      
      if (response.success) {
        // Asegurarse de que siempre haya un array, incluso si data es null o undefined
        setSubscriptions(response.data || []);
        
        // Si hay un mensaje pero no hay suscripciones, mostrarlo como información, no como error
        if (response.message && (!response.data || response.data.length === 0)) {
          console.info("Mensaje sobre suscripciones:", response.message);
        }
      } else {
        setSubscriptionsError(response.error || "No se pudieron cargar las suscripciones");
      }
    } catch (err) {
      console.error("Error fetching subscriptions:", err);
      setSubscriptionsError("Error al conectar con el servidor");
    } finally {
      setSubscriptionsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <Button 
          variant="outline" 
          className="gap-2" 
          onClick={() => navigate('/customers')}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Clientes
        </Button>
        
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <p className="font-medium">
                {error || "No se encontró el cliente solicitado"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button and edit button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button 
          variant="outline" 
          className="gap-2 w-fit" 
          onClick={() => navigate('/customers')}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Clientes
        </Button>
        
        <Button 
          className="gap-2 w-fit" 
          onClick={() => navigate(`/customers/${id}/edit`)}
        >
          <Edit className="h-4 w-4" />
          Editar Cliente
        </Button>
      </div>
      
      {/* Customer Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-6 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
          <Building className="h-8 w-8 text-white" />
        </div>
        
        <div className="flex-grow">
          <h1 className="text-2xl font-bold text-gray-900">
            {customer?.display_name}
          </h1>
          
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
            {customer?.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="h-4 w-4 text-blue-600" />
                <span>{customer.email}</span>
              </div>
            )}
            
            {customer?.phone && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="h-4 w-4 text-blue-600" />
                <span>{customer.phone}</span>
              </div>
            )}
            
            {customer?.website && (
              <div className="flex items-center gap-2 text-gray-600">
                <Globe className="h-4 w-4 text-blue-600" />
                <span>{customer.website}</span>
              </div>
            )}
            
            {customer?.created_time && (
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span>Cliente desde {new Date(customer.created_time).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Customer Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              Información de la Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer?.company_name && (
              <div>
                <p className="text-sm font-medium text-gray-500">Nombre de la Empresa</p>
                <p className="text-gray-900">{customer.company_name}</p>
              </div>
            )}
            
            {(customer?.first_name || customer?.last_name) && (
              <div>
                <p className="text-sm font-medium text-gray-500">Contacto Principal</p>
                <p className="text-gray-900">
                  {[customer?.first_name, customer?.last_name].filter(Boolean).join(" ")}
                </p>
              </div>
            )}
            
            {customer?.currency_code && (
              <div>
                <p className="text-sm font-medium text-gray-500">Moneda</p>
                <p className="text-gray-900">{customer.currency_code}</p>
              </div>
            )}
            
            {customer?.status && (
              <div>
                <p className="text-sm font-medium text-gray-500">Estado</p>
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${customer.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                  <p className="text-gray-900 capitalize">{customer.status}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Billing Address */}
        {customer?.billing_address && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Dirección de Facturación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer.billing_address.attention && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Atención</p>
                  <p className="text-gray-900">{customer.billing_address.attention}</p>
                </div>
              )}
              
              {customer.billing_address.address && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Dirección</p>
                  <p className="text-gray-900">{customer.billing_address.address}</p>
                  {customer.billing_address.street2 && (
                    <p className="text-gray-900">{customer.billing_address.street2}</p>
                  )}
                </div>
              )}
              
              {(customer.billing_address.city || customer.billing_address.state || customer.billing_address.zip) && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Ciudad/Estado/CP</p>
                  <p className="text-gray-900">
                    {[customer.billing_address.city, customer.billing_address.state, customer.billing_address.zip].filter(Boolean).join(", ")}
                  </p>
                </div>
              )}
              
              {customer.billing_address.country && (
                <div>
                  <p className="text-sm font-medium text-gray-500">País</p>
                  <p className="text-gray-900">{customer.billing_address.country}</p>
                </div>
              )}
              
              {customer.billing_address.phone && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Teléfono</p>
                  <p className="text-gray-900">{customer.billing_address.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Subscriptions */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Suscripciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subscriptionsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : subscriptionsError ? (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p>{subscriptionsError}</p>
              </div>
            ) : subscriptions.length === 0 ? (
              <p className="text-gray-500">No hay suscripciones disponibles para este cliente.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Próximo Cobro</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((subscription) => (
                      <TableRow key={subscription.subscription_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{subscription.name}</p>
                            <p className="text-sm text-gray-500">{subscription.subscription_number}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${subscription.status === 'active' ? 'bg-green-500' : subscription.status === 'expired' ? 'bg-red-500' : 'bg-gray-500'}`}></span>
                            <span className="capitalize">{subscription.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {subscription.next_billing_at ? new Date(subscription.next_billing_at).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-medium">{subscription.amount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Transactions */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              Transacciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : transactionsError ? (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p>{transactionsError}</p>
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-gray-500">No hay transacciones disponibles para este cliente.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.transaction_id}>
                        <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                        <TableCell className="capitalize">{transaction.type}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${transaction.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                            <span className="capitalize">{transaction.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{transaction.amount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Notes */}
        {customer?.notes && (
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-line">{customer.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}