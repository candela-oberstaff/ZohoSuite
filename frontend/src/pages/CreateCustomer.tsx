import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { CustomerCreate, BillingAddress } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Building, Save, Loader2 } from "lucide-react";

export default function CreateCustomer() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CustomerCreate>({
    display_name: "",
    company_name: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    mobile: "",
    website: "",
    notes: "",
    billing_address: {
      attention: "",
      address: "",
      street2: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      phone: "",
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Handle nested billing_address fields
    if (name.startsWith("billing_")) {
      const addressField = name.replace("billing_", "");
      setFormData(prev => ({
        ...prev,
        billing_address: {
          ...prev.billing_address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate required fields
    if (!formData.display_name) {
      setError("El nombre de visualización es obligatorio");
      setLoading(false);
      return;
    }

    try {
      // Clean up empty billing address fields
      const billingAddress: Partial<BillingAddress> = {};
      let hasAddressData = false;
      
      Object.entries(formData.billing_address || {}).forEach(([key, value]) => {
        if (value && value.trim() !== "") {
          billingAddress[key as keyof BillingAddress] = value;
          hasAddressData = true;
        }
      });

      // Prepare data for API
      const customerData: CustomerCreate = {
        ...formData,
        billing_address: hasAddressData ? billingAddress as BillingAddress : undefined
      };

      // Remove empty fields
      Object.keys(customerData).forEach(key => {
        const value = customerData[key as keyof CustomerCreate];
        if (value === "" || value === undefined) {
          delete customerData[key as keyof CustomerCreate];
        }
      });

      const response = await api.createCustomer(customerData);

      if (response.success && response.data) {
        // Navigate to the customer detail page
        navigate(`/customers/${response.data.customer_id}`);
      } else {
        setError(response.error || "Error al crear el cliente");
      }
    } catch (err) {
      console.error("Error creating customer:", err);
      setError("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={() => navigate('/customers')}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Crear Nuevo Cliente
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Añade un nuevo cliente a Zoho Billing
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="display_name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nombre de visualización *
                </label>
                <Input
                  id="display_name"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleInputChange}
                  placeholder="Nombre para mostrar"
                  required
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="company_name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nombre de la empresa
                </label>
                <Input
                  id="company_name"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  placeholder="Nombre de la empresa"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="first_name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nombre
                </label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  placeholder="Nombre de contacto"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="last_name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Apellido
                </label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  placeholder="Apellido de contacto"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="correo@ejemplo.com"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Teléfono
                </label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Teléfono de contacto"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="mobile" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Móvil
                </label>
                <Input
                  id="mobile"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  placeholder="Teléfono móvil"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="website" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sitio web
                </label>
                <Input
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="www.ejemplo.com"
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dirección de Facturación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="billing_attention" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Atención
                </label>
                <Input
                  id="billing_attention"
                  name="billing_attention"
                  value={formData.billing_address?.attention || ""}
                  onChange={handleInputChange}
                  placeholder="Persona o departamento"
                  className="w-full"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="billing_address" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Dirección
                </label>
                <Input
                  id="billing_address"
                  name="billing_address"
                  value={formData.billing_address?.address || ""}
                  onChange={handleInputChange}
                  placeholder="Dirección línea 1"
                  className="w-full"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="billing_street2" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Dirección (línea 2)
                </label>
                <Input
                  id="billing_street2"
                  name="billing_street2"
                  value={formData.billing_address?.street2 || ""}
                  onChange={handleInputChange}
                  placeholder="Dirección línea 2"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="billing_city" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ciudad
                </label>
                <Input
                  id="billing_city"
                  name="billing_city"
                  value={formData.billing_address?.city || ""}
                  onChange={handleInputChange}
                  placeholder="Ciudad"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="billing_state" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Estado/Provincia
                </label>
                <Input
                  id="billing_state"
                  name="billing_state"
                  value={formData.billing_address?.state || ""}
                  onChange={handleInputChange}
                  placeholder="Estado o provincia"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="billing_zip" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Código Postal
                </label>
                <Input
                  id="billing_zip"
                  name="billing_zip"
                  value={formData.billing_address?.zip || ""}
                  onChange={handleInputChange}
                  placeholder="Código postal"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="billing_country" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  País
                </label>
                <Input
                  id="billing_country"
                  name="billing_country"
                  value={formData.billing_address?.country || ""}
                  onChange={handleInputChange}
                  placeholder="País"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="billing_phone" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Teléfono
                </label>
                <Input
                  id="billing_phone"
                  name="billing_phone"
                  value={formData.billing_address?.phone || ""}
                  onChange={handleInputChange}
                  placeholder="Teléfono de facturación"
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Notas adicionales
              </label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Información adicional sobre el cliente"
                className="w-full min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/customers')}
          >
            Cancelar
          </Button>
          
          <Button 
            type="submit" 
            disabled={loading}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar Cliente
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}