import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import api from '@/services/api';

interface ProfessionRole {
  id: string;
  name: string;
  description: string | null;
  hourlyRate: number | null;
  dailyRate: number | null;
  billingType?: 'HOUR' | 'DAY' | 'M2' | 'ML' | 'BOCA';
  ratePerUnit?: number | null;
  bocaRates?: { label: string; price: number }[];
}

export const RolesManager: React.FC = () => {
  const [roles, setRoles] = useState<ProfessionRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<ProfessionRole | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hourlyRate: '',
    dailyRate: '',
    billingType: 'HOUR',
    ratePerUnit: '',
    bocaRates: [] as { label: string; price: number }[],
  });

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const response = await api.get('/profession-roles');
      setRoles(response.data);
    } catch (error) {
      console.error('Error al cargar roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await api.put(`/profession-roles/${editingRole.id}`, formData);
      } else {
        await api.post('/profession-roles', formData);
      }
      setShowModal(false);
      resetForm();
      loadRoles();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al guardar rol');
    }
  };

  const handleEdit = (role: ProfessionRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      hourlyRate: role.hourlyRate?.toString() || '',
      dailyRate: role.dailyRate?.toString() || '',
      billingType: role.billingType || 'HOUR',
      ratePerUnit: role.ratePerUnit?.toString() || '',
      bocaRates: role.bocaRates || [],
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este rol?')) {
      try {
        await api.delete(`/profession-roles/${id}`);
        loadRoles();
      } catch (error) {
        console.error('Error al eliminar rol:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      hourlyRate: '',
      dailyRate: '',
      billingType: 'HOUR',
      ratePerUnit: '',
      bocaRates: [],
    });
  };

  if (loading) {
    return <div className="animate-pulse">Cargando roles...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Roles y Oficios</h3>
          <p className="text-sm text-gray-600 mt-1">
            Administrá los roles de profesionales para tus proyectos
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={16} className="mr-2" />
          Nuevo Rol
        </Button>
      </div>

      {roles.length === 0 ? (
        <Card className="text-center py-12">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No tenés roles configurados
          </h3>
          <p className="text-gray-600 mb-6">
            Creá roles para asignarlos a las tareas de tus proyectos
          </p>
          <Button onClick={() => setShowModal(true)}>
            Crear Primer Rol
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <Card key={role.id} className="hover:shadow-lg transition-shadow">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{role.name}</h4>
                    {role.description && (
                      <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                    )}
                  </div>
                </div>

                {(role.hourlyRate || role.dailyRate) && (
                  <div className="border-t pt-3 space-y-1">
                    {role.hourlyRate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tarifa por hora</span>
                        <span className="font-medium">${role.hourlyRate.toLocaleString('es-AR')}</span>
                      </div>
                    )}
                    {role.dailyRate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tarifa por día</span>
                        <span className="font-medium">${role.dailyRate.toLocaleString('es-AR')}</span>
                      </div>
                    )}
                  </div>
                )}
                {(role.billingType === 'M2' || role.billingType === 'ML') && role.ratePerUnit && (
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tarifa por {role.billingType === 'M2' ? 'm²' : 'ml'}</span>
                      <span className="font-medium">${role.ratePerUnit.toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                )}
                {role.billingType === 'BOCA' && role.bocaRates && role.bocaRates.length > 0 && (
                  <div className="border-t pt-3 space-y-1">
                    {role.bocaRates.map((rate) => (
                      <div key={rate.label} className="flex justify-between text-sm">
                        <span className="text-gray-600">{rate.label}</span>
                        <span className="font-medium">${Number(rate.price).toLocaleString('es-AR')}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex space-x-2 pt-3 border-t">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleEdit(role)}
                    className="flex-1"
                  >
                    <Edit size={14} className="mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(role.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingRole ? 'Editar Rol' : 'Nuevo Rol'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre del Rol"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Ej: Albañil, Sanitarista, Electricista"
          />

          <Input
            label="Descripción (opcional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Breve descripción del rol"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de cobro</label>
              <select
                value={formData.billingType}
                onChange={(e) => setFormData({ ...formData, billingType: e.target.value as any })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="HOUR">Por hora</option>
                <option value="DAY">Por día</option>
                <option value="M2">Por m²</option>
                <option value="ML">Por metro lineal</option>
                <option value="BOCA">Por boca (electricidad)</option>
              </select>
            </div>
          </div>

          {formData.billingType === 'HOUR' && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Tarifa por Hora (opcional)"
                type="number"
                step="0.01"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                placeholder="0.00"
              />

              <Input
                label="Tarifa por Día (opcional)"
                type="number"
                step="0.01"
                value={formData.dailyRate}
                onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
                placeholder="0.00"
              />
            </div>
          )}

          {formData.billingType === 'DAY' && (
            <Input
              label="Tarifa por Día"
              type="number"
              step="0.01"
              value={formData.dailyRate}
              onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
              placeholder="0.00"
            />
          )}

          {(formData.billingType === 'M2' || formData.billingType === 'ML') && (
            <Input
              label={`Tarifa por ${formData.billingType === 'M2' ? 'm²' : 'metro lineal'}`}
              type="number"
              step="0.01"
              value={formData.ratePerUnit}
              onChange={(e) => setFormData({ ...formData, ratePerUnit: e.target.value })}
              placeholder="0.00"
            />
          )}

          {formData.billingType === 'BOCA' && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">Tipos de boca y tarifas</div>
              {formData.bocaRates.length === 0 && (
                <div className="text-xs text-gray-500">Agregá al menos un tipo de boca.</div>
              )}
              {formData.bocaRates.map((rate, index) => (
                <div key={`${rate.label}-${index}`} className="grid grid-cols-2 gap-2 items-center">
                  <input
                    value={rate.label}
                    onChange={(e) => {
                      const next = [...formData.bocaRates];
                      next[index] = { ...next[index], label: e.target.value };
                      setFormData({ ...formData, bocaRates: next });
                    }}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Ej: Luz LED, Toma exterior"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={rate.price}
                      onChange={(e) => {
                        const next = [...formData.bocaRates];
                        next[index] = { ...next[index], price: Number(e.target.value) };
                        setFormData({ ...formData, bocaRates: next });
                      }}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="0.00"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        const next = formData.bocaRates.filter((_, idx) => idx !== index);
                        setFormData({ ...formData, bocaRates: next });
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                onClick={() => setFormData({ ...formData, bocaRates: [...formData.bocaRates, { label: '', price: 0 }] })}
              >
                Agregar tipo de boca
              </Button>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingRole ? 'Actualizar' : 'Crear Rol'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
